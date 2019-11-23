import React from "react";
import * as crossfilter from "crossfilter2/crossfilter";
import SourceService from "../services/DependencyService/DependencyService";

export const DepContext = React.createContext("DepContext");

export class DependencyContext extends React.Component {
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
        this.sourceService.getDependency().then(dependencies=> {

            this.ndx = dependencies;
            this.setState({loading:false,hasNDX:true});
        });
    }

    render() {
        if(!this.state.hasNDX) {
            return null;
        }
        return (
            <DepContext.Provider value={{ndx:this.ndx}}>
                <div ref={this.parent}>
                    {this.props.children}
                </div>
            </DepContext.Provider>
        );
    }
}
