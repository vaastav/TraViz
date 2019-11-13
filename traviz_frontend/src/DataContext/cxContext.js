import React from "react";
import crossfilter from "crossfilter2";
import {timeFormat, timeParse, timeMonth, format} from 'd3'
import TraceService from "../services/TraceService/TraceService";

export const CXContext = React.createContext("CXContext");
export const dateFormatSpecifier = '%Y-%m-%d %H:%M:%S';
export const dateFormat = timeFormat(dateFormatSpecifier);
export const dateFormatParser = timeParse(dateFormatSpecifier);

export class DataContext extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            loading:false,
            hasNDX:false,
            traces:[]    
        };

        this.traceService = new TraceService();
    }

    componentDidMount() {
        if (this.state.hasNDX) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setState({loading:true});
        window.alert("Mounting DataContext");
        this.traceService.getAllTraces().then(response => {
            this.setState({ traces: response});
        });
        this.state.traces.forEach(function (d) {
            d.dd = dateFormatParser(d.Date);
            d.month = timeMonth(d.dd);
            d.Duration = +d.Duration;
            d.Tags = +d.Tags;
            d.NumEvents = +d.NumEvents;
        });
        this.ndx = crossfilter(this.state.traces);
        this.setState({loading:false,hasNDX:true});
    }

    render() {
        if(!this.state.hasNDX) {
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