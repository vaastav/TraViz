import React from "react";
import * as dc from "dc";

const ResetButton = props => {
  return (
    <input class="btn" type="button" value="Reset"
      onClick={() => {
        props.chart.filterAll();
        dc.redrawAll();
      }}
    />
  );
};

export const ChartTemplate = props => {
    /*
    We render the dc chart using an effect. We want to pass the chart as a prop after the dc call,
    but there is nothing by default to trigger a re-render and the prop, by default would be undefined.
    To solve this, we hold a state key and increment it after the effect ran. 
    By passing the key to the parent div, we get a rerender once the chart is defined. 
    */
  const context = props.context;
  const [chart,updateChart] = React.useState(null);
  const ndx = context.ndx;
  const div = React.useRef(null);
  React.useEffect(() => {
    const newChart = props.chartFunction(div.current, ndx); // chartfunction takes the ref and does something with it

    newChart.render();
    updateChart(newChart);
  },1); {/*Run this exactly once */}

  return (
    <div
      ref={div}
    >
     <label>{props.title}</label>
     <ResetButton chart={chart} /> 
    </div>
  );
};
