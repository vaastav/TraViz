import React from "react";
import * as dc from "dc";
import { scaleLinear, scaleSymlog } from "d3";
import { ChartTemplate } from "./chartTemplate";
import { SrcContext } from "./srcContext";
import * as reductio from "reductio";

const fileChartFunc = (divRef, ndx) => {
    const fileChart = dc.rowChart(divRef);

    const dimension = ndx.dimension(d=> d.Fname);
    const fileGroup = dimension.group();
    const reducer = reductio().count(true);
    reducer(fileGroup);
    const group = dimension.group().reduceSum(function(d) {return d.Count;});
    const xscale = scaleSymlog().domain([0, 1000000]).range([0, 750]);
    fileChart
    .width(750)
    .height(600)
    .dimension(dimension)
    .group(group)
    .x(xscale)
    .linearColors(["#80ff80", "#4dff4d", "#1aff1a" , "#00e600" , "#00b300" ])
    .colorAccessor(function(d) { 
        var i;
        var val;
        var vals = fileGroup.top(Infinity);
        for (i = 0; i < vals.length; i++) {
            if (vals[i].key === d.key) {
                val = vals[i].value.count;
            }
        }
        if (val <= 25) {
            return 0;
        } else if (val > 25 && val <= 50) {
            return 1;
        } else if (val > 50 && val <= 75) {
            return 2;
        } else if (val > 75 && val <= 100) {
            return 3;
        } else {
            return 4;
        }
    })
    .ordering(function(d) { return d.value; });

    fileChart.xAxis().tickValues([1, 10, 100, 1000, 10000, 100000, 1000000]).tickFormat(
        function (v) {
            return v;
        }
    );

    fileChart.addFilterHandler(function (filters, filter) {
        filters.length = 0;
        filters.push(filter);
        return filters;
    });

    var oldClick = fileChart.onClick;
    fileChart.onClick = function(d) {
        document.getElementById("linechart").style.visibility="visible";
        var chart = this;
        return oldClick.call(chart, d);
    };

    return fileChart;
}

export const FileChart = props => (
    <ChartTemplate chartFunction={fileChartFunc} context={React.useContext(SrcContext)} title="Distribution of Events across files"  idToHide={"linechart"} />
)
