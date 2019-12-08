import React from "react";
import * as dc from "dc";
import "dc/dc.css";

import { format as d3Format } from 'd3'
import * as d3 from "d3";
import { TableTemplate } from "./tableTemplate";
import { numberFormat, CXContext } from "./cxContext";

const tableFunc = (divRef, ndx) => {
    const traceTable = dc.dataTable(divRef);

    const dimension = ndx.dimension(d => d.dd);
    var ofs = 0;
    var pag = 20;
    var tableHeaderCallback = function(table, d) {
        d.sort_state = d.sort_state === "ascending" ? "descending" : "ascending";
        var isAscendingOrder = d.sort_state === "ascending";
        table.order(isAscendingOrder ? d3.ascending : d3.descending).sortBy(function (datum) {return datum[d.field_name];});
        table.redraw();
    }
    traceTable.dimension(dimension)
        .group(d => {
            var format = d3Format('02d');
            return d.dd.getFullYear() + '/' + format((d.dd.getMonth() + 1));
        })
        .columns([
            {
                label: 'ID',
                format: function (d) {
                    return '<a href=trace/' + d.ID + '>' + d.ID + '</a>'
                },
                sort_state: 'ascending',
                field_name: 'ID'
            },
            {
                label: 'Date',
                format: function (d) {
                    return d.dd.getUTCFullYear() + "/" + (d.dd.getUTCMonth() + 1) + "/" + d.dd.getUTCDate()
                },
                sort_state: 'ascending',
                field_name: 'dd'
            },
            {
                label: 'Duration',
                format: function (d) {
                    return d.Duration;
                },
                sort_state: 'ascending',
                field_name: 'Duration'
            },
            {
                label: 'NumEvents',
                format: function (d) {
                    return d.NumEvents;
                },
                sort_state: 'ascending',
                field_name: 'NumEvents'
            },
            {
                label: 'Tags',
                format: function (d) {
                    return d.Tags;
                },
                sort_state: 'ascending',
                field_name: 'Tags'
            }
        ])
        .sortBy(function (d) {
            return d.dd;
        })
        .size(Infinity)
        .showGroups(false)
        .on('preRender', function (table) {
            var totFilteredRecs = ndx.groupAll().value();
            var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
            ofs = ofs >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / pag) * pag : ofs;
            ofs = ofs < 0 ? 0 : ofs;
            table.beginSlice(ofs);
            table.endSlice(ofs + pag);
        })
        .on('preRedraw', function (table) {
            var totFilteredRecs = ndx.groupAll().value();
            ofs = table.beginSlice();
            console.log(ofs);
            var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
            ofs = ofs >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / pag) * pag : ofs;
            ofs = ofs < 0 ? 0 : ofs;
            console.log(ofs);
            table.beginSlice(ofs);
            table.endSlice(ofs + pag);
        })
        .on('pretransition', function (table) {
            table.selectAll("th.dc-table-head").on("click", function(d) {
                tableHeaderCallback(table, d);
            });
            var totFilteredRecs = ndx.groupAll().value();
            var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
            d3.select('#begin')
                .text(end === 0 ? ofs : ofs + 1);
            d3.select('#end')
                .text(end);
            d3.select('#last')
                .attr('disabled', ofs - pag < 0 ? 'true' : null);
            d3.select('#next')
                .attr('disabled', ofs + pag >= totFilteredRecs ? 'true' : null);
            d3.select('#size').text(totFilteredRecs);
            if (totFilteredRecs != ndx.size()) {
                d3.select('#totalsize').text("(filtered Total: " + ndx.size() + " )");
            } else {
                d3.select('#totalsize').text('');
            }
        });

    return traceTable;

}

export const TraceTable = props => (
    <div className="fullTable">
        <TableTemplate tableFunction={tableFunc} context={React.useContext(CXContext)} title="Summary Table" />
    </div>

)
