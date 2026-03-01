import sys
import socket
import time
import os
from datetime import datetime


HOST = "192.168.4.1"
PORT = 27050

# 读socket的底层块大小：越大越少syscall（一般 4K~16K 都可以）
SOCK_READ_CHUNK = 8192

# 文件数据循环每次期望读的最大块（保持你原来的 32KB）
FILE_CHUNK = 32768


def format_rate(bps: float) -> str:
    """
    将 bytes/s 格式化为 KB/s 或 MB/s（满足 MB 级别则不使用 KB 显示）。
    采用 1024 进制：1KB=1024B, 1MB=1024KB
    """
    if bps < 0:
        bps = 0.0

    if bps >= 1024 ** 2:
        return f"{bps / (1024 ** 2):.2f} MB/s"
    else:
        return f"{bps / 1024:.2f} KB/s"


class SocketReader:
    """带缓冲的socket读取器：减少 recv(1) 的syscall开销，并提供 read_exact 能力。"""
    __slots__ = ("sock", "buf")

    def __init__(self, sock: socket.socket):
        self.sock = sock
        self.buf = bytearray()

    def _fill(self, min_bytes: int) -> None:
        """确保缓冲区至少有 min_bytes 可读，否则继续从socket读。"""
        while len(self.buf) < min_bytes:
            chunk = self.sock.recv(SOCK_READ_CHUNK)
            if not chunk:
                # 连接被对端关闭
                raise ConnectionError("Socket closed by peer while receiving data.")
            self.buf.extend(chunk)

    def read_exact(self, n: int) -> bytes:
        """精确读取 n 字节；不足会继续从socket读，直到读满或断开。"""
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


def main():
    start = time.time()
    total = 0

    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # 可选：保持默认行为不设timeout；若你想避免永远卡住，可取消注释下一行
    # s.settimeout(20)
    s.connect((HOST, PORT))

    r = SocketReader(s)

    for index in range(1, len(sys.argv)):
        date = sys.argv[index]  # 传入参数名，保持原样用于目录名
        dt = datetime.strptime(date, "%Y%m%d")
        print(f"Date: {date}")
        count = 1

        # ✅ 按你的新规则：目录名 = "RE" + 传入参数名
        folder = f"RE{date}"
        os.makedirs(folder, exist_ok=True)

        # 第一个日期先请求DK
        if index == 1:
            request = bytes([0x11])
        else:
            request = bytes([0x01, 0x01, dt.year - 2000, dt.month, dt.day])

        s.sendall(request)

        while True:
            cmd = r.read_u8()

            if cmd == 0x12:
                # DK fixed 32 bytes
                dk = r.read_exact(32)
                print(f"DK: {dk}")

                # 收到DK后立即请求对应日期文件
                request = bytes([0x01, 0x01, dt.year - 2000, dt.month, dt.day])
                s.sendall(request)

            elif cmd == 0x02:
                count = r.read_u16be()
                print(f"Files: {count}")

            elif cmd == 0x03:
                start_ns = time.time_ns()

                fnl = r.read_u8()
                filename = r.read_exact(fnl).decode("UTF-8", errors="strict")

                # 关键：保留“原始文件名”，但去掉可能携带的路径，只取 basename
                # 这样不会把文件放到根目录或创建多层目录
                base_name = os.path.basename(filename .replace("\\", "/"))
                save_path = os.path.join(folder, base_name)

                size = r.read_u32be()

                # 用更大缓冲写文件，减少 Python 层写入开销（行为不变）
                with open(save_path, "wb", buffering=1024 * 1024) as f:
                    remaining = size
                    while remaining > 0:
                        want = FILE_CHUNK if remaining > FILE_CHUNK else remaining
                        data = r.read_exact(want)  # 关键：确保读满 want
                        f.write(data)
                        remaining -= want

                total += size

                end_ns = time.time_ns()
                elapsed_s = (end_ns - start_ns) / 1_000_000_000
                bps = int(size / elapsed_s) if elapsed_s > 0 else 0

                print(f"File: {base_name} -> {save_path} {size} bytes @ {bps} BPS")
                count -= 1

            elif cmd == 0x04:
                print(f"End of files ({count})")
                break

            else:
                # 原代码对未知cmd是静默忽略（会继续循环读）
                # 这里选择直接报错更利于调试，但会改变“容错”行为。
                # 若你想绝对保持原行为，可改为: continue
                raise ValueError(f"Unknown command byte: 0x{cmd:02X}")

    # Send a complete command
    s.sendall(bytes([0x21]))
    s.close()

    delta = time.time() - start
    overall_bps = (total / delta) if delta > 0 else 0.0
    print(f"{total} bytes in {delta:.3f}s = {format_rate(overall_bps)}")


if __name__ == "__main__":
    main()
