USE traviz ;

CREATE TABLE `traviz`.`events_aggregate`(
    fname varchar(256),
    linenum int,
    operation varchar(64) NOT NULL,
    taskCount BIGINT,
    primary key(fname, linenum, operation)
)
