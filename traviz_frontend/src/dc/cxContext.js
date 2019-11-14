import React from "react";
import * as crossfilter from "crossfilter2/crossfilter";
import {csv,timeFormat,timeParse,timeMonth,format} from 'd3'
import TraceService from "../services/TraceService/TraceService";
import "dc/dc.css";

export const CXContext = React.createContext("CXContext");
export const  dateFormatSpecifier = '%Y-%m-%d %H:%M:%S';
export const dateFormat = timeFormat(dateFormatSpecifier);
export const dateFormatParser = timeParse(dateFormatSpecifier);
export const numberFormat = format('.2f');

export class DataContext extends React.Component {
  constructor(props) {
    super(props);
    this.state={loading:false,hasNDX:false,traces:[]};

    this.traceService = new TraceService();
  }

  componentDidMount(){
      if (this.state.hasNDX){
          return
      }
      if(this.state.loading){
          return
      }
      this.setState({loading:true})
      this.traceService.getAllTraces().then(traces => {
          console.log("Reached here");
          console.log(traces);
          traces.forEach(function (d) {
              d.dd = dateFormatParser(d.Date);
              d.month = timeMonth(d.dd);
              d.Duration = +d.Duration / 1000000;
              d.NumEvents = +d.NumEvents;
              d.Tags = d.Tags;
          });
          console.log(traces);
          this.ndx = crossfilter(traces);
          this.setState({loading:false,hasNDX:true});  
      });
  }

  render() {
      if(!this.state.hasNDX){
          return null;
      }
    return (
      <CXContext.Provider value={{ndx:this.ndx}}>
        <div ref={this.parent}>
        {this.props.children}
        </div>
      </CXContext.Provider>
    );
  }
}
