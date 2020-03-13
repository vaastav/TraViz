USE traviz ;

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
    endTime TIMESTAMP,
    primary key(trace_id, span_id, operation),
    foreign key(trace_id) references overview(trace_id)
);
