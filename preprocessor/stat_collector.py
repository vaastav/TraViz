import os
import sys
import json
import numpy as np

def walk(dir_name,outfile):
    count = 0
    report_count = []
    unique_tags = {}
    unique_vals = {}
    attributes = {}
    for root, dnames, fnames in os.walk(dir_name):
        print("Processing " + root) 
        for f in fnames:
            if f.endswith(".json"):
                with open(os.path.join(root,f), 'r') as inf:
                    data = json.load(inf)
                    if len(data) != 1:
                        print(os.path.join(root,f), "has", len(data), "traces")
                    try:
                        report_count += [len(data[0]["reports"])]
                        events = data[0]["reports"]
                        for event in events:
                            for key in event.keys():
                                attributes[key] = True
                                if key not in unique_vals:
                                    unique_vals[key] = {}
                                unique_vals[key][str(event[key])] = True
                    except:
                        print("Issue parsing ", os.path.join(root,f))
                count += 1
    with open(outfile, 'w+') as outf:
        outf.write("Attributes:" + ','.join(attributes.keys()) + "\n")
        outf.write("Average number of events" + str(np.mean(report_count)) + "\n")
        outf.write("Min number of events" + str(np.min(report_count)) + "\n")
        outf.write("Max number of events" + str(np.max(report_count)) + "\n")
        outf.write("Number of traces" + str(count) + "\n")
        for key, lovals in unique_vals.items():
            outf.write("Values for attribute " + key + ": " + str(len(lovals.keys())) + "\n")
            if len(lovals.keys()) <=25:
                outf.write("Values: " + ','.join(lovals.keys()) + "\n")

def main():
    if len(sys.argv) != 3:
        print("Usage: python stat_collector.py <dir_name> <outfile>")
        sys.exit(1)
    dir_name = sys.argv[1]
    outfile = sys.argv[2]
    walk(dir_name, outfile)

if __name__ == '__main__':
    main()
