import React from "react";
import * as crossfilter from "crossfilter2/crossfilter";
import SourceService from "../services/SourceService/SourceService";

export const SrcContext = React.createContext("SrcContext");

export class SourceContext extends React.Component {
    constructor(props) {
        super(props);
        this.state={loading:false,hasNDX:false};
        this.sourceService = new SourceService();
    }

    componentDidMount() {
        if (this.state.hasNDX) {
            return;
        }
        if (this.state.loading) {
            return;
        }
        this.setState({loading:true})
        this.sourceService.getSource().then(sources=> {
            sources.forEach(function (d) {
                d.Count = +d.Count;
                d.Fname = d.Fname;
                d.Linenum = +d.Linenum;
                d.Link = d.Link;
            });
            console.log(sources);

            this.ndx = crossfilter(sources);
            this.setState({loading:false,hasNDX:true});
        });
    }

    render() {
        if(!this.state.hasNDX) {
            return null;
        }
        return (
            <SrcContext.Provider value={{ndx:this.ndx}}>
                <div ref={this.parent}>
                    {this.props.children}
                </div>
            </SrcContext.Provider>
        );
    }
}
