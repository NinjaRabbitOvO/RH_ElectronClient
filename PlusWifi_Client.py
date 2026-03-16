import argparse
import json
import os
import socket
import time
from datetime import datetime


HOST = "192.168.4.1"
PORT = 27050
DEFAULT_WIFI_NAME = "ESP32-S3"

SOCK_READ_CHUNK = 8192
FILE_CHUNK = 32768


def emit_event(event_type: str, **payload):
    message = {"type": event_type}
    message.update(payload)
    print(f"@@EVENT@@ {json.dumps(message, ensure_ascii=True)}", flush=True)


def format_rate(bps: float) -> str:
    if bps < 0:
        bps = 0.0

    if bps >= 1024 ** 2:
        return f"{bps / (1024 ** 2):.2f} MB/s"
    return f"{bps / 1024:.2f} KB/s"


def sanitize_wifi_name(value: str) -> str:
    raw = (value or "").strip() or DEFAULT_WIFI_NAME
    safe = "".join(
        "_" if (ord(ch) < 32 or ch in '<>:"/\\|?*') else ch
        for ch in raw
    )
    safe = "_".join(part for part in safe.split())
    safe = safe.strip("_")
    return safe or DEFAULT_WIFI_NAME


def build_output_folder(root_dir: str, date_code: str, wifi_name: str) -> str:
    safe_wifi = sanitize_wifi_name(wifi_name)
    return os.path.join(root_dir, f"{safe_wifi}_RE{date_code}")


class SocketReader:
    __slots__ = ("sock", "buf")

    def __init__(self, sock: socket.socket):
        self.sock = sock
        self.buf = bytearray()

    def _fill(self, min_bytes: int) -> None:
        while len(self.buf) < min_bytes:
            chunk = self.sock.recv(SOCK_READ_CHUNK)
            if not chunk:
                raise ConnectionError("Socket closed by peer while receiving data.")
            self.buf.extend(chunk)

    def read_exact(self, n: int) -> bytes:
        if n <= 0:
            return b""
        self._fill(n)
        out = bytes(self.buf[:n])
        del self.buf[:n]
        return out

    def read_u8(self) -> int:
        return self.read_exact(1)[0]

    def read_u16be(self) -> int:
        return int.from_bytes(self.read_exact(2), "big")

    def read_u32be(self) -> int:
        return int.from_bytes(self.read_exact(4), "big")


def parse_args():
    parser = argparse.ArgumentParser(description="TCP file receiver client")
    parser.add_argument("dates", nargs="+", help="Transfer date list, format YYYYMMDD")
    parser.add_argument("--wifi-name", default=DEFAULT_WIFI_NAME, help="Connected Wi-Fi SSID")
    return parser.parse_args()


def main():
    args = parse_args()
    root_dir = os.path.dirname(__file__)
    start = time.time()
    total = 0

    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client.connect((HOST, PORT))
    emit_event("session", mode="tcp", endpoint=f"{HOST}:{PORT}")

    reader = SocketReader(client)

    for index, date in enumerate(args.dates, start=1):
        date_code = str(date).strip()
        dt = datetime.strptime(date_code, "%Y%m%d")
        print(f"Date: {date_code}")
        emit_event("date", date=date_code)
        count = 1

        folder = build_output_folder(root_dir, date_code, args.wifi_name)
        os.makedirs(folder, exist_ok=True)
        emit_event("folder", path=folder)

        if index == 1:
            request = bytes([0x11])
        else:
            request = bytes([0x01, 0x01, dt.year - 2000, dt.month, dt.day])
        client.sendall(request)

        while True:
            cmd = reader.read_u8()

            if cmd == 0x12:
                dk = reader.read_exact(32)
                print(f"DK: {dk}")
                request = bytes([0x01, 0x01, dt.year - 2000, dt.month, dt.day])
                client.sendall(request)
                continue

            if cmd == 0x02:
                count = reader.read_u16be()
                print(f"Files: {count}")
                emit_event("files_count", count=count)
                continue

            if cmd == 0x03:
                start_ns = time.time_ns()

                filename_len = reader.read_u8()
                filename = reader.read_exact(filename_len).decode("UTF-8", errors="strict")
                base_name = os.path.basename(filename.replace("\\", "/"))
                save_path = os.path.join(folder, base_name)

                size = reader.read_u32be()
                emit_event(
                    "file_start",
                    name=base_name,
                    path=save_path,
                    size=size,
                    received=0,
                    remaining=size,
                    percent=0.0,
                )

                with open(save_path, "wb", buffering=1024 * 1024) as output_file:
                    remaining = size
                    while remaining > 0:
                        expected = FILE_CHUNK if remaining > FILE_CHUNK else remaining
                        data = reader.read_exact(expected)
                        output_file.write(data)
                        remaining -= expected
                        received = size - remaining
                        elapsed = (time.time_ns() - start_ns) / 1_000_000_000
                        rate_bps = int(received / elapsed) if elapsed > 0 else 0
                        percent = (received / size) * 100 if size > 0 else 100.0
                        emit_event(
                            "file_progress",
                            name=base_name,
                            size=size,
                            received=received,
                            remaining=remaining,
                            percent=percent,
                            bps=rate_bps,
                        )

                total += size
                elapsed_s = (time.time_ns() - start_ns) / 1_000_000_000
                bps = int(size / elapsed_s) if elapsed_s > 0 else 0

                print(f"File: {base_name} -> {save_path} {size} bytes @ {bps} BPS")
                emit_event(
                    "file_done",
                    name=base_name,
                    path=save_path,
                    size=size,
                    received=size,
                    remaining=0,
                    percent=100.0,
                    bps=bps,
                )
                count -= 1
                continue

            if cmd == 0x04:
                print(f"End of files ({count})")
                break

            raise ValueError(f"Unknown command byte: 0x{cmd:02X}")

    client.sendall(bytes([0x21]))
    client.close()

    delta = time.time() - start
    overall_bps = (total / delta) if delta > 0 else 0.0
    print(f"{total} bytes in {delta:.3f}s = {format_rate(overall_bps)}")
    emit_event(
        "summary",
        total_bytes=total,
        elapsed=delta,
        average_bps=overall_bps,
        average_rate=format_rate(overall_bps),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
