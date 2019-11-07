import os
import sys
import numpy as np

def walk(root_dir, outfile):
    num_files = 0
    lines_per_file = []
    for root, dnames, fnames in os.walk(root_dir):
        print("Processing directory:", root)
        for f in fnames:
            num_files += 1
            with open(os.path.join(root,f), 'r+', encoding='utf-8') as inf:
                num_lines = 0
                try:
                    for line in inf:
                        num_lines += 1
                    lines_per_file += [num_lines]
                except Exception as e:
                    print(e)

    with open(outfile, 'a+') as outf:
        outf.write("Number of files in source: " + str(num_files) + "\n")
        outf.write("Total number of lines in source: " + str(np.sum(lines_per_file)) + "\n")
        outf.write("Avg. number of lines per file: " + str(np.mean(lines_per_file)) + "\n")
        outf.write("Max number of lines per file: " + str(np.max(lines_per_file)) + "\n")
        outf.write("Min number of lines per file: " + str(np.min(lines_per_file)) + "\n")

def main():
    if len(sys.argv) != 3:
        print("Usage: python stat_src_code_collector.py <source_root> <outfile>")
        sys.exit(1)
    root_dir = sys.argv[1]
    outfile = sys.argv[2]
    walk(root_dir, outfile)

if __name__ == '__main__':
    main()
