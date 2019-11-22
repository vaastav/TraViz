USE traviz;

CREATE TABLE `traviz`.`dependencies`(
    trace_id varchar(64) NOT NULL,
    source varchar(64) NOT NULL,
    destination varchar(64) NOT NULL,
    num int, 
    primary key(trace_id, source, destination),
    foreign key(trace_id) references overview(trace_id)
);
