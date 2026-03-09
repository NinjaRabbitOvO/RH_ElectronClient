import sys
import struct
import binascii


def main():
    filename = sys.argv[1]
    print("=========== parse file {} ===========".format(filename))
    with open(filename, "rb") as f:
        data = f.read()
        print("=========== total read size: {} ===========".format(len(data)))
        print("Separator: {}".format(hex(int.from_bytes(data[0:4], byteorder='little'))))
        print("UTC Format year: {}".format(int.from_bytes(data[4:8], byteorder='little')))
        print("UTC Format month: {}".format(int.from_bytes(data[8:12], byteorder='little')))
        print("UTC Format day: {}".format(int.from_bytes(data[12:16], byteorder='little')))
        print("UTC Format hour: {}".format(int.from_bytes(data[16:20], byteorder='little')))
        print("UTC Format minute: {}".format(int.from_bytes(data[20:24], byteorder='little')))
        print("latitude: {}".format(struct.unpack('<f', data[24:28])[0]))
        print("longitude: {}".format(struct.unpack('<f', data[28:32])[0]))
        print("UTC Format zone: {}".format(int.from_bytes(data[32:36], byteorder='little')))
        print("TEMP1: {}".format(struct.unpack('<f', data[36:40])[0]))
        print("TEMP2: {}".format(struct.unpack('<f', data[40:44])[0]))
        print("HUM_TEMP: {}".format(struct.unpack('<f', data[44:48])[0]))
        print("HUM: {}".format(struct.unpack('<f', data[48:52])[0]))
        print("Water: {}".format(struct.unpack('<f', data[52:56])[0]))
        print("Capacitor_V: {}".format(int.from_bytes(data[56:60], byteorder='little')))
        print("Bat_v: {}".format(int.from_bytes(data[60:64], byteorder='little')))
        
        if int.from_bytes(data[0:4], byteorder='little') == 0xff:
            sample_size = int.from_bytes(data[64:68], byteorder='little')
            print("Sample_Size: {}".format(sample_size))
            print("Start_Timestamp: {}".format(int.from_bytes(data[68:72], byteorder='little')))
            start_index = 72

            print("X list: ")
            for i in range(sample_size):
                value = struct.unpack('<h', data[start_index: start_index+2])[0]
                print("{}".format(value), end=",")
                start_index += 2

            print("\nY list: ")
            for j in range(sample_size):
                value = struct.unpack('<h', data[start_index: start_index+2])[0]
                print("{}".format(value), end=",")
                start_index += 2

            print("\nZ list: ")
            for k in range(sample_size):
                value = struct.unpack('<h', data[start_index: start_index+2])[0]
                print("{}".format(value), end=",")
                start_index += 2

            print('')
            sample_size2 = int.from_bytes(data[start_index:start_index+4], byteorder='little')
            print("Sample_Size2: {}".format(sample_size2))
            start_index += 4

            print("Track_return_voltage list: ")
            for l in range(sample_size2):
                value = struct.unpack('<h', data[start_index: start_index+2])[0]
                print("{}".format(value), end=",")
                start_index += 2

            print('')


if __name__ == "__main__":
    main()
