import React from "react";
import * as dc from "dc";

import { format as d3Format } from 'd3';
import { ChartTemplate } from "./chartTemplate";

const tableFunc = (divRef, ndx) => {
    const traceTable = dc.dataTable(divRef);

    const dimension = ndx.dimension(d=>d.dd);
    traceTable.dimension(dimension)
    .group(d=>{
        var format = d3Format('02d');
        return d.dd.getFullYear() + '/' + format((d.dd.getMonth() + 1));
    })
    .columns([
        'ID',
        'Date',
        'Duration',
        'NumEvents',
        'Tags'
    ])
    .sortBy(function (d) {
        return d.dd;
    })
    .on('renderlet', function(table) {
        table.selectAll('.dc-table-group').classed('info', true);
    });

    return traceTable;
}

export const TraceTable = props => (
    <ChartTemplate chartFunction={tableFunc} title="Summary Table"/>
)