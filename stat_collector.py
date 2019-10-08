import os
import sys

def walk(dir_name):
    count = 0
    for root, dnames, fnames in os.walk(dir_name):
        print("Processing " + root) 
        for f in fnames:
            if f.endswith(".json"):
                count += 1
    print("Number of traces ",count)

def main():
    if len(sys.argv) != 2:
        print("Usage: python stat_collector.py <dir_name>")
        sys.exit(1)
    dir_name = sys.argv[1]
    walk(dir_name)

if __name__ == '__main__':
    main()
