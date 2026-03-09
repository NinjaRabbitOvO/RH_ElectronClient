#!/usr/bin/env python3
import argparse
import struct
from pathlib import Path
from typing import Sequence

HEADER_FIXED_LEN = 64
HEADER_WITH_SAMPLE_INFO_LEN = 72


class ParseError(Exception):
    pass


def expect_length(data: bytes, offset: int, needed: int, label: str) -> None:
    if len(data) < offset + needed:
        raise ParseError(
            f"{label} is truncated: need {needed} bytes at offset {offset}, "
            f"but file size is {len(data)} bytes."
        )


def read_u32_le(data: bytes, offset: int, label: str) -> int:
    expect_length(data, offset, 4, label)
    return int.from_bytes(data[offset : offset + 4], byteorder="little", signed=False)


def read_f32_le(data: bytes, offset: int, label: str) -> float:
    expect_length(data, offset, 4, label)
    return struct.unpack_from("<f", data, offset)[0]


def read_i16_array(data: bytes, offset: int, count: int, label: str) -> tuple[list[int], int]:
    if count < 0:
        raise ParseError(f"{label} has invalid count: {count}")
    size = count * 2
    expect_length(data, offset, size, label)
    values = list(struct.unpack_from(f"<{count}h", data, offset))
    return values, offset + size


def format_preview(values: Sequence[int], preview: int, full: bool) -> str:
    if full or len(values) <= preview * 2:
        return ",".join(str(v) for v in values)

    head = ",".join(str(v) for v in values[:preview])
    tail = ",".join(str(v) for v in values[-preview:])
    return f"{head},...,{tail}"


def parse_file(path: Path, preview: int, full: bool) -> None:
    data = path.read_bytes()
    if len(data) < HEADER_WITH_SAMPLE_INFO_LEN:
        raise ParseError(
            f"File is too short ({len(data)} bytes). "
            f"Minimum expected header length is {HEADER_WITH_SAMPLE_INFO_LEN} bytes."
        )

    print(f"=========== parse file {path} ===========")
    print(f"=========== total read size: {len(data)} ===========")

    separator = read_u32_le(data, 0, "separator")
    year = read_u32_le(data, 4, "UTC year")
    month = read_u32_le(data, 8, "UTC month")
    day = read_u32_le(data, 12, "UTC day")
    hour = read_u32_le(data, 16, "UTC hour")
    minute = read_u32_le(data, 20, "UTC minute")
    latitude = read_f32_le(data, 24, "latitude")
    longitude = read_f32_le(data, 28, "longitude")
    zone = read_u32_le(data, 32, "UTC zone")
    temp1 = read_f32_le(data, 36, "TEMP1")
    temp2 = read_f32_le(data, 40, "TEMP2")
    hum_temp = read_f32_le(data, 44, "HUM_TEMP")
    hum = read_f32_le(data, 48, "HUM")
    water = read_f32_le(data, 52, "Water")
    capacitor_v = read_u32_le(data, 56, "Capacitor_V")
    bat_v = read_u32_le(data, 60, "Bat_v")

    print(f"Separator: {hex(separator)}")
    print(f"UTC Format year: {year}")
    print(f"UTC Format month: {month}")
    print(f"UTC Format day: {day}")
    print(f"UTC Format hour: {hour}")
    print(f"UTC Format minute: {minute}")
    print(f"latitude: {latitude}")
    print(f"longitude: {longitude}")
    print(f"UTC Format zone: {zone}")
    print(f"TEMP1: {temp1}")
    print(f"TEMP2: {temp2}")
    print(f"HUM_TEMP: {hum_temp}")
    print(f"HUM: {hum}")
    print(f"Water: {water}")
    print(f"Capacitor_V: {capacitor_v}")
    print(f"Bat_v: {bat_v}")

    if separator != 0xFF:
        print("Separator is not 0xFF, skipping sample arrays for this file.")
        print("")
        return

    sample_size = read_u32_le(data, 64, "Sample_Size")
    start_timestamp = read_u32_le(data, 68, "Start_Timestamp")
    print(f"Sample_Size: {sample_size}")
    print(f"Start_Timestamp: {start_timestamp}")

    offset = HEADER_WITH_SAMPLE_INFO_LEN
    x_values, offset = read_i16_array(data, offset, sample_size, "X list")
    y_values, offset = read_i16_array(data, offset, sample_size, "Y list")
    z_values, offset = read_i16_array(data, offset, sample_size, "Z list")

    print(f"X list ({len(x_values)}):")
    print(format_preview(x_values, preview, full))
    print(f"Y list ({len(y_values)}):")
    print(format_preview(y_values, preview, full))
    print(f"Z list ({len(z_values)}):")
    print(format_preview(z_values, preview, full))

    sample_size2 = read_u32_le(data, offset, "Sample_Size2")
    offset += 4
    print(f"Sample_Size2: {sample_size2}")

    track_values, offset = read_i16_array(
        data, offset, sample_size2, "Track_return_voltage list"
    )
    print(f"Track_return_voltage list ({len(track_values)}):")
    print(format_preview(track_values, preview, full))

    remaining = len(data) - offset
    if remaining > 0:
        print(f"Trailing bytes: {remaining}")
    print("")


def iter_targets(target_path: Path) -> list[Path]:
    if target_path.is_file():
        return [target_path]

    if target_path.is_dir():
        files = sorted(p for p in target_path.glob("*.dat") if p.is_file())
        if not files:
            raise ParseError(f"No .dat files found in directory: {target_path}")
        return files

    raise ParseError(f"Path does not exist: {target_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse one .dat file or all .dat files in a directory."
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="ExampleData/20260112172403.dat",
        help="Path to a .dat file or a directory containing .dat files.",
    )
    parser.add_argument(
        "--preview",
        type=int,
        default=12,
        help="How many values to show at the head/tail when not using --full.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Print full sample arrays without truncation.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero status if any file fails to parse.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_path = Path(args.path)

    try:
        targets = iter_targets(target_path)
    except OSError as error:
        print(f"[ReadData] file I/O error: {error}")
        return 1
    except ParseError as error:
        print(f"[ReadData] {error}")
        return 1

    has_error = False
    for file_path in targets:
        try:
            parse_file(file_path, preview=max(1, args.preview), full=args.full)
        except ParseError as error:
            has_error = True
            print(f"[ReadData] {file_path}: {error}")
            print("")
        except OSError as error:
            has_error = True
            print(f"[ReadData] {file_path}: file I/O error: {error}")
            print("")

    if has_error and args.strict:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
