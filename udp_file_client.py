#!/usr/bin/env python3
import argparse
import json
import os
import random
import socket
import struct
import sys
import time
from typing import List, Tuple

MAGIC = 0xA5
VERSION = 0x01

MSG_HELLO_REQ = 0x01
MSG_HELLO_RSP = 0x02
MSG_LIST_DATES_REQ = 0x10
MSG_LIST_DATES_RSP = 0x11
MSG_LIST_FILES_REQ = 0x20
MSG_LIST_FILES_RSP = 0x21
MSG_GET_FILE_REQ = 0x30
MSG_GET_FILE_ACK = 0x31
MSG_DATA = 0x32
MSG_ACK = 0x33
MSG_FILE_END = 0x34
MSG_ERROR = 0xE0

HDR_FMT = "!BBBBIIIHH"  # magic, version, msg_type, flags, session_id, seq, ack, payload_len, crc16
HDR_LEN = struct.calcsize(HDR_FMT)

LIST_REQ_LEN = 70
GET_REQ_LEN = 28

DEFAULT_PORT = 6000
PROGRESS_BAR_WIDTH = 30
PROGRESS_REFRESH_SEC = 0.2
DEFAULT_WIFI_NAME = "ESP32-S3"
ERR_TRANSFER_BUSY = 0x0005
GET_FILE_MAX_ATTEMPTS = 20
GET_FILE_BUSY_RETRY_BASE_SEC = 0.4
GET_FILE_BUSY_RETRY_MAX_SEC = 2.0


def emit_event(event_type: str, **payload):
    message = {"type": event_type}
    message.update(payload)
    print(f"@@EVENT@@ {json.dumps(message, ensure_ascii=True)}", flush=True)


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
    return os.path.join(root_dir, f"{safe_wifi}_Re{date_code}")


def remove_empty_dir(directory: str) -> bool:
    if not directory:
        return False
    if not os.path.isdir(directory):
        return False
    if os.listdir(directory):
        return False
    os.rmdir(directory)
    return True


def format_units(value: float, unit_base: int = 1024) -> Tuple[float, str]:
    units = ["B", "KB", "MB", "GB", "TB"]
    idx = 0
    while idx + 1 < len(units) and value >= unit_base:
        value /= unit_base
        idx += 1
    return value, units[idx]


def format_size(num_bytes: int) -> str:
    value, unit = format_units(float(num_bytes))
    if value >= 100:
        return f"{value:.0f}{unit}"
    if value >= 10:
        return f"{value:.1f}{unit}"
    return f"{value:.2f}{unit}"


def format_speed(num_bytes: int, elapsed: float) -> str:
    if elapsed <= 0:
        return "0B/s"
    value, unit = format_units(num_bytes / elapsed)
    if value >= 100:
        return f"{value:.0f}{unit}/s"
    if value >= 10:
        return f"{value:.1f}{unit}/s"
    return f"{value:.2f}{unit}/s"


def format_eta(seconds: float) -> str:
    if seconds <= 0 or seconds == float("inf"):
        return "--:--"
    total = int(seconds + 0.5)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def crc16_ccitt(data: bytes, crc: int = 0xFFFF) -> int:
    for b in data:
        crc ^= b << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc & 0xFFFF


def crc32_le(data: bytes, crc: int = 0xFFFFFFFF) -> int:
    crc ^= 0xFFFFFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xEDB88320
            else:
                crc >>= 1
    crc ^= 0xFFFFFFFF
    return crc & 0xFFFFFFFF


def pack_header(msg_type: int, session_id: int, seq: int = 0, ack: int = 0, payload: bytes = b"") -> bytes:
    payload_len = len(payload)
    hdr = struct.pack(HDR_FMT, MAGIC, VERSION, msg_type, 0, session_id, seq, ack, payload_len, 0)
    crc = crc16_ccitt(hdr + payload)
    hdr = struct.pack(HDR_FMT, MAGIC, VERSION, msg_type, 0, session_id, seq, ack, payload_len, crc)
    return hdr


def unpack_header(data: bytes):
    if len(data) < HDR_LEN:
        return None
    fields = struct.unpack(HDR_FMT, data[:HDR_LEN])
    return {
        "magic": fields[0],
        "version": fields[1],
        "msg_type": fields[2],
        "flags": fields[3],
        "session_id": fields[4],
        "seq": fields[5],
        "ack": fields[6],
        "payload_len": fields[7],
        "crc16": fields[8],
    }


def check_crc(data: bytes) -> bool:
    if len(data) < HDR_LEN:
        return False
    hdr = unpack_header(data)
    if not hdr:
        return False
    crc_recv = hdr["crc16"]
    if crc_recv == 0:
        return True
    hdr_zero = struct.pack(
        HDR_FMT,
        hdr["magic"],
        hdr["version"],
        hdr["msg_type"],
        hdr["flags"],
        hdr["session_id"],
        hdr["seq"],
        hdr["ack"],
        hdr["payload_len"],
        0,
    )
    calc = crc16_ccitt(hdr_zero + data[HDR_LEN:])
    return calc == crc_recv


def recv_packet(sock: socket.socket, timeout: float = 2.0):
    sock.settimeout(timeout)
    while True:
        data, _ = sock.recvfrom(4096)
        hdr = unpack_header(data)
        if not hdr:
            continue
        if hdr["magic"] != MAGIC or hdr["version"] != VERSION:
            continue
        if not check_crc(data):
            continue
        payload = data[HDR_LEN:HDR_LEN + hdr["payload_len"]]
        return hdr, payload


def parse_error(payload: bytes):
    if len(payload) < 3:
        return 0, ""
    code = struct.unpack("!H", payload[0:2])[0]
    msg_len = payload[2]
    msg = payload[3:3 + msg_len].decode("ascii", errors="ignore") if msg_len else ""
    return code, msg


def send_packet(sock: socket.socket, addr: Tuple[str, int], msg_type: int, session_id: int,
                seq: int = 0, ack: int = 0, payload: bytes = b""):
    hdr = pack_header(msg_type, session_id, seq=seq, ack=ack, payload=payload)
    sock.sendto(hdr + payload, addr)


def list_files(sock: socket.socket, addr: Tuple[str, int], session_id: int, date: str,
               mode: int = 0, since: str = "", start: str = "", end: str = ""):
    cursor = ""
    results = []
    while True:
        payload = bytearray(LIST_REQ_LEN)
        payload[0:8] = date.encode("ascii")[:8]
        payload[8] = mode & 0xFF
        if cursor:
            payload[9:23] = cursor.encode("ascii")[:14]
        if since:
            payload[23:37] = since.encode("ascii")[:14]
        if start:
            payload[37:51] = start.encode("ascii")[:14]
        if end:
            payload[51:65] = end.encode("ascii")[:14]

        hdr = None
        resp = b""
        for _ in range(5):
            send_packet(sock, addr, MSG_LIST_FILES_REQ, session_id, payload=bytes(payload))
            try:
                hdr, resp = recv_packet(sock, timeout=2.5)
            except TimeoutError:
                continue
            if hdr["msg_type"] == MSG_LIST_FILES_RSP or hdr["msg_type"] == MSG_ERROR:
                break
        if hdr is None:
            raise TimeoutError("LIST_FILES timeout")
        if hdr["msg_type"] == MSG_ERROR:
            code, msg = parse_error(resp)
            raise RuntimeError(f"LIST_FILES error: code=0x{code:04X} {msg}")
        if hdr["msg_type"] != MSG_LIST_FILES_RSP:
            raise RuntimeError("Unexpected response")

        if len(resp) < 2:
            break
        count = resp[0]
        more = resp[1] != 0
        if count == 0:
            break
        cursor = resp[2:16].decode("ascii", errors="ignore")
        offset = 16
        for _ in range(count):
            name = resp[offset:offset + 14].decode("ascii", errors="ignore")
            offset += 14
            size = struct.unpack("!I", resp[offset:offset + 4])[0]
            offset += 4
            crc = struct.unpack("!I", resp[offset:offset + 4])[0]
            offset += 4
            results.append((name, size, crc))
        if not more:
            break
    return results


def get_file(sock: socket.socket, addr: Tuple[str, int], session_id: int,
             date: str, name: str, out_path: str):
    payload = bytearray(GET_REQ_LEN)
    payload[0:8] = date.encode("ascii")[:8]
    payload[8:22] = name.encode("ascii")[:14]
    payload[22:26] = struct.pack("!I", 0)
    payload[26:28] = struct.pack("!H", 1450)

    hdr = None
    resp = b""
    get_ack_attempts = 0
    last_error = None
    for attempt in range(1, GET_FILE_MAX_ATTEMPTS + 1):
        get_ack_attempts += 1
        send_packet(sock, addr, MSG_GET_FILE_REQ, session_id, payload=bytes(payload))
        try:
            hdr, resp = recv_packet(sock, timeout=2.5)
        except TimeoutError:
            continue
        if hdr["msg_type"] == MSG_GET_FILE_ACK:
            break
        if hdr["msg_type"] == MSG_ERROR:
            code, msg = parse_error(resp)
            last_error = (code, msg)
            if code == ERR_TRANSFER_BUSY and attempt < GET_FILE_MAX_ATTEMPTS:
                retry_delay = min(
                    GET_FILE_BUSY_RETRY_BASE_SEC * attempt,
                    GET_FILE_BUSY_RETRY_MAX_SEC,
                )
                print(
                    f"GET_FILE busy for {name}.dat "
                    f"(attempt {attempt}/{GET_FILE_MAX_ATTEMPTS}), "
                    f"retrying in {retry_delay:.1f}s...",
                )
                time.sleep(retry_delay)
                hdr = None
                continue
            raise RuntimeError(f"GET_FILE error: code=0x{code:04X} {msg}")
        hdr = None
    if hdr is None:
        if last_error and last_error[0] == ERR_TRANSFER_BUSY:
            raise RuntimeError(
                "GET_FILE error: code=0x0005 Transfer busy "
                f"(after {GET_FILE_MAX_ATTEMPTS} retries)"
            )
        raise TimeoutError("GET_FILE timeout")
    if hdr["msg_type"] != MSG_GET_FILE_ACK:
        raise RuntimeError("Unexpected GET_FILE_ACK")

    if len(resp) < 10:
        raise RuntimeError("Bad GET_FILE_ACK")
    file_size = struct.unpack("!I", resp[0:4])[0]
    blk = struct.unpack("!H", resp[8:10])[0]
    if blk <= 0 or blk > 1200:
        blk = 1200

    emit_event(
        "file_start",
        name=f"{name}.dat",
        path=out_path,
        size=file_size,
        received=0,
        remaining=file_size,
        percent=0.0,
    )

    received = 0
    crc = 0
    last_seq = -1
    idle_timeout = 0
    start_time = time.time()
    last_update = 0.0
    peak_speed = 0.0
    min_speed = None
    data_timeouts = 0
    with open(out_path, "wb") as f:
        while received < file_size:
            try:
                hdr, payload = recv_packet(sock, timeout=6.0)
            except TimeoutError:
                idle_timeout += 1
                data_timeouts += 1
                if idle_timeout >= 5:
                    raise
                continue

            idle_timeout = 0
            if hdr["msg_type"] == MSG_ERROR:
                code, msg = parse_error(payload)
                raise RuntimeError(f"DATA error: code=0x{code:04X} {msg}")
            if hdr["msg_type"] == MSG_FILE_END:
                break
            if hdr["msg_type"] != MSG_DATA:
                continue
            if len(payload) < 10:
                continue
            offset = struct.unpack("!I", payload[4:8])[0]
            data_len = struct.unpack("!H", payload[8:10])[0]
            data = payload[10:10 + data_len]

            if offset != received:
                send_packet(sock, addr, MSG_ACK, session_id, ack=hdr["seq"], payload=b"")
                continue

            f.write(data)
            received += data_len
            crc = crc32_le(data, crc)
            send_packet(sock, addr, MSG_ACK, session_id, ack=hdr["seq"], payload=b"")
            last_seq = hdr["seq"]

            now = time.time()
            if now - last_update >= PROGRESS_REFRESH_SEC or received >= file_size:
                elapsed = max(now - start_time, 1e-6)
                avg_speed = received / elapsed
                eta = (file_size - received) / avg_speed if avg_speed > 0 else float("inf")
                inst_speed = data_len / max(now - last_update, 1e-6)
                peak_speed = max(peak_speed, inst_speed)
                if min_speed is None or inst_speed < min_speed:
                    min_speed = inst_speed
                percent = (received / file_size) * 100 if file_size else 100.0
                filled = int(PROGRESS_BAR_WIDTH * percent / 100)
                bar = "#" * filled + "-" * (PROGRESS_BAR_WIDTH - filled)
                speed = format_speed(received, now - start_time)
                sys.stdout.write(
                    f"\r[{bar}] {percent:6.2f}% "
                    f"{format_size(received)}/{format_size(file_size)} "
                    f"{speed} {elapsed:5.1f}s ETA {format_eta(eta)}"
                )
                sys.stdout.flush()
                emit_event(
                    "file_progress",
                    name=f"{name}.dat",
                    size=file_size,
                    received=received,
                    remaining=max(0, file_size - received),
                    percent=percent,
                    bps=int(avg_speed),
                )
                last_update = now

        if received >= file_size:
            if received > 0:
                now = time.time()
                speed = format_speed(received, now - start_time)
                elapsed = now - start_time
                sys.stdout.write(
                    f"\r[{'#' * PROGRESS_BAR_WIDTH}] 100.00% "
                    f"{format_size(received)}/{format_size(file_size)} "
                    f"{speed} {elapsed:5.1f}s\n"
                )
                sys.stdout.flush()
                emit_event(
                    "file_done",
                    name=f"{name}.dat",
                    path=out_path,
                    size=file_size,
                    received=received,
                    remaining=0,
                    percent=100.0,
                    bps=int(avg_speed),
                )
            try:
                hdr, payload = recv_packet(sock, timeout=2.0)
            except TimeoutError:
                return
            if hdr["msg_type"] == MSG_FILE_END and len(payload) >= 8:
                crc_remote = struct.unpack("!I", payload[4:8])[0]
                if crc_remote != crc:
                    print(f"CRC mismatch for {name}.dat (remote={crc_remote:08X}, local={crc:08X})")
    elapsed = max(time.time() - start_time, 1e-6)
    avg_speed = received / elapsed
    if min_speed is None:
        min_speed = avg_speed
    retries = max(0, get_ack_attempts - 1) + data_timeouts
    return {
        "bytes": received,
        "elapsed": elapsed,
        "avg_speed": avg_speed,
        "peak_speed": peak_speed,
        "min_speed": min_speed,
        "retries": retries,
    }


def main():
    parser = argparse.ArgumentParser(description="UDP file client")
    parser.add_argument("date", help="Date folder, YYYYMMDD")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Server port")
    parser.add_argument("--since", default="", help="Since file name, YYYYMMDDHHMMSS")
    parser.add_argument("--wifi-name", default=DEFAULT_WIFI_NAME, help="Connected Wi-Fi SSID")
    args = parser.parse_args()

    date = args.date
    if len(date) != 8 or not date.isdigit():
        print("Invalid date format, expected YYYYMMDD")
        return 1

    emit_event("session", mode="udp", endpoint=f"192.168.4.1:{args.port}")
    emit_event("date", date=date)

    session_id = random.getrandbits(32)

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(2.0)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 256 * 1024)
    addr = ("192.168.4.1", args.port)
    out_dir = None

    try:
        # HELLO
        send_packet(sock, addr, MSG_HELLO_REQ, session_id, payload=b"")
        try:
            hdr, _ = recv_packet(sock)
            if hdr["msg_type"] == MSG_ERROR:
                code, msg = parse_error(_)
                print(f"HELLO error: code=0x{code:04X} {msg}")
            elif hdr["msg_type"] != MSG_HELLO_RSP:
                print(f"HELLO response unexpected: {hdr['msg_type']}")
        except Exception:
            pass

        mode = 1 if args.since else 0
        files = list_files(sock, addr, session_id, date, mode=mode, since=args.since)
        if not files:
            print("No files")
            emit_event("files_count", count=0)
            return 0
        emit_event("files_count", count=len(files))

        out_dir = build_output_folder(os.path.dirname(__file__), date, args.wifi_name)
        os.makedirs(out_dir, exist_ok=True)
        emit_event("folder", path=out_dir)

        total_bytes = 0
        total_elapsed = 0.0
        total_retries = 0
        peak_speed = 0.0
        min_speed = None
        for name, size, _ in files:
            out_path = os.path.join(out_dir, f"{name}.dat")
            print(f"Downloading {name}.dat ({size} bytes)")
            stats = get_file(sock, addr, session_id, date, name, out_path)
            total_bytes += stats["bytes"]
            total_elapsed += stats["elapsed"]
            total_retries += stats["retries"]
            peak_speed = max(peak_speed, stats["peak_speed"])
            if min_speed is None or stats["min_speed"] < min_speed:
                min_speed = stats["min_speed"]
            print(f"File retries: {stats['retries']}  Time: {stats['elapsed']:.1f}s")

        avg_speed = total_bytes / total_elapsed if total_elapsed > 0 else 0.0
        if min_speed is None:
            min_speed = avg_speed

        print("Done")
        print(f"Total files: {len(files)}")
        print(f"Total size : {format_size(total_bytes)}")
        print(f"Total time : {total_elapsed:.1f}s")
        print(f"Avg/file   : {(total_elapsed / len(files)):.1f}s")
        print(f"Avg speed  : {format_speed(total_bytes, total_elapsed)}")
        print(f"Peak speed : {format_speed(peak_speed, 1.0)}")
        print(f"Min speed  : {format_speed(min_speed, 1.0)}")
        print(f"Total retries: {total_retries}")
        emit_event(
            "summary",
            total_bytes=total_bytes,
            elapsed=total_elapsed,
            average_bps=avg_speed,
            average_rate=format_speed(total_bytes, total_elapsed),
            total_files=len(files),
            total_retries=total_retries,
        )
        return 0
    except Exception:
        if out_dir and remove_empty_dir(out_dir):
            emit_event("folder_cleanup", path=out_dir)
        raise
    finally:
        sock.close()


if __name__ == "__main__":
    raise SystemExit(main())
