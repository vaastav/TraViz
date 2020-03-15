USE traviz ;

CREATE TABLE `traviz`.`events`(
    event_id varchar(64) NOT NULL,
    trace_id varchar(64) NOT NULL,
    span_id varchar(64) NOT NULL,
    operation varchar(64) NOT NULL,
    linenum int,
    fname varchar(256),
    timestamp TIMESTAMP,
    label varchar(256) NOT NULL,
    host varchar(64) NOT NULL,
    cycles BIGINT,
    primary key(event_id, trace_id, span_id, operation, linenum, fname, timestamp, label, host, cycles),
    foreign key(trace_id) references overview(trace_id)
);
