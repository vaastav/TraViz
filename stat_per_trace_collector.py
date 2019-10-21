import os
import sys
import json
import numpy as np

def walk(dir_name, outfile):
    num_parents_per_event = []
    unique_threads_per_trace = []
    tags_per_trace = []
    for root, dnames, fnames in os.walk(dir_name):
        print("Processing directory: " + root)
        for f in fnames:
            if f.endswith(".json"):
                with open(os.path.join(root,f), 'r') as inf:
                    unique_threads = {}
                    tags = []
                    data = json.load(inf)
                    if len(data) != 1:
                        print(os.path.join(root,f), "has", len(data), "traces")
                        continue
                    events = data[0]["reports"]
                    for event in events:
                        try:
                            parents = event["ParentEventID"]
                            num_parents_per_event += [len(parents)]
                        except:
                            num_parents_per_event += [0]
                        if "Tag" in event.keys():
                            tag_list = event["Tag"]
                            for t in tag_list:
                                tags += [t]
                        thread = event["Host"] + "-" + event["ProcessName"] + "-" + str(event["ProcessID"]) + ":" + str(event["ThreadID"])
                        unique_threads[thread] = True
                    tags_per_trace = len(tags)
                    unique_threads_per_trace += [len(unique_threads)]
    with open(outfile, "a+") as outf:
        outf.write("Avg Num Parent Events Per Event: " + str(np.mean(num_parents_per_event)) + "\n")
        outf.write("Min Parent Events Per Event: " + str(np.min(num_parents_per_event)) + "\n")
        outf.write("Max Parent Events Per Event: " + str(np.max(num_parents_per_event)) + "\n")
        outf.write("Avg Num Unique Threads Per Trace: " + str(np.mean(unique_threads_per_trace)) + "\n")
        outf.write("Min Unique Threads Per Trace: " + str(np.min(unique_threads_per_trace)) + "\n")
        outf.write("Max Unique Threads Per Trace: " + str(np.max(unique_threads_per_trace)) + "\n")
        outf.write("Avg Num Tags Per Trace: " + str(np.mean(tags_per_trace)) + "\n")
        outf.write("Min Num Tags Per Trace: " + str(np.min(tags_per_trace)) + "\n")
        outf.write("Max Num Tags Per Trace: " + str(np.max(tags_per_trace)) + "\n")
                        
                        
def main():
    if len(sys.argv) != 3:
        print("Usage: python stat_collector.py <dir_name> <outfile>")
        sys.exit(1)
    dir_name = sys.argv[1]
    outfile = sys.argv[2]
    walk(dir_name, outfile)

if __name__ == '__main__':
    main()
