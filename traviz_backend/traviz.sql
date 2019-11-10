CREATE SCHEMA traviz ;

USE traviz ;

CREATE TABLE `traviz`.`overview`(
    trace_id varchar(64) NOT NULL,
    duration UNSIGNED BIGINT,
    doc date,
    loc varchar(256),
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
    primary key(trace_id, linenum, fname),
    foreign key(trace_id) references overview(trace_id)
);