CREATE SCHEMA traviz ;

USE traviz ;

CREATE TABLE `traviz`.`overview`(
    trace_id varchar(64) NOT NULL,
    duration BIGINT UNSIGNED,
    doc TIMESTAMP,
    loc varchar(256),
    num_events int,
    unique(trace_id),
    primary key(trace_id)
);

CREATE TABLE `traviz`.`tags`(
    trace_id varchar(64) NOT NULL,
    tag varchar(32),
    primary key(trace_id, tag),
    foreign key(trace_id) references overview(trace_id)
);

CREATE TABLE `traviz`.`sourcecode`(
    trace_id varchar(64) NOT NULL,
    linenum int,
    fname varchar(256),
    num int,
    primary key(trace_id, linenum, fname)
);

CREATE TABLE `traviz`.`dependencies`(
    trace_id varchar(64) NOT NULL,
    source varchar(64) NOT NULL,
    destination varchar(64) NOT NULL,
    num int, 
    primary key(trace_id, source, destination)
);

CREATE TABLE `traviz`.`tasks`(
    trace_id varchar(64) NOT NULL,
    span_id varchar(64) NOT NULL,
    duration BIGINT UNSIGNED,
    operation varchar(64) NOT NULL,
    linenum int,
    fname varchar(256),
    processName varchar(64),
    processID int,
    threadID BIGINT,
    startTime TIMESTAMP,
    primary key(trace_id, span_id, operation)
);

CREATE TABLE `traviz`.`span_links`(
    trace_id varchar(64) NOT NULL,
    src_span_id varchar(64) NOT NULL,
    src_operation varchar(64) NOT NULL, 
    dst_span_id varchar(64) NOT NULL,
    dst_operation varchar(64) NOT NULL,
    primary key(trace_id, src_span_id, dst_span_id)
);

CREATE TABLE `traviz`.`span_times`(
    span_id varchar(64) NOT NULL,
    startTime datetime,
    endTime datetime,
    primary key(span_id, startTime, endTime)
);

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
    primary key(event_id, trace_id, span_id, timestamp)
);

