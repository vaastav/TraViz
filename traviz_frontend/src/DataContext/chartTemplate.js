import React from "react";
import { CXContext } from "./cxContext";
import * as dc from "dc";

const ResetButton = props => {
    return (
        <span
            onClick={() => {
                props.chart.filterAll();
                dc.redrawAll();
            }}
        >
            reset
        </span>
    );
}

export const ChartTemplate = props => {
    const context = React.useContext(CXContext);
    const [chart, updateChart] = React.useState(null);
    const ndx = context.ndx;
    const div = React.useRef(null);
    React.useEffect(() => {
        const newChart = props.chartFunction(div.current, ndx);

        newChart.render();
        updateChart(newChart);
    }, 1); {/* Run this exactly once */}
    return (
        <div ref={div}>
            <ResetButton chart={chart} />
            <label>{props.title}</label>
        </div>
    );
};