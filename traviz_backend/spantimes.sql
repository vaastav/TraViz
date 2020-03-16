USE traviz ;

CREATE TABLE `traviz`.`span_times`(
    span_id varchar(64) NOT NULL,
    startTime datetime,
    endTime datetime,
    primary key(span_id, startTime, endTime)
)
