USE traviz;

CREATE TABLE events_aggregate AS SELECT COUNT(DISTINCT span_id) AS taskCount, fname AS fname, linenum AS linenum, operation AS operation FROM events GROUP BY fname, linenum, operation;

CREATE TABLE trace_times AS select MIN(span_times.startTime) AS minStart, MAX(span_times.endTime) AS maxEnd, tasks.trace_id FROM span_times, tasks WHERE span_times.span_id=tasks.span_id GROUP BY tasks.trace_id;

CREATE TABLE molehillData AS SELECT span_times.startTime AS start, span_times.endTime AS end, tasks.ProcessName AS processName, tasks.ProcessID AS processID, tasks.Operation AS operation FROM span_times, tasks WHERE span_times.span_id=tasks.span_id;
