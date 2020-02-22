import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "../../pages/Home/Home";
import Source from "../../pages/Source/Source";
import TraceEvents from "../../pages/TraceEvents/TraceEvents"
import Dependency from "../../pages/Dependency/Dependency"
import Compare1v1 from "../../pages/Compare1v1/Compare1v1"
import Aggregate from "../../pages/Aggregate/Aggregate"
import Travista from "../../pages/TraVista/TraVista"

import "./Main.css";

function Main() {
    return (
        <main>
            <Switch>
                <Route exact path="/" component={Home} />
                <Route exact path="/source" component={Source} />
                <Route exact path="/trace/:id" component={TraceEvents} />
                <Route exact path="/dependency" component={Dependency} />
                <Route exact path="/compare/onevsone/:trace1/:trace2" component={Compare1v1} />
                <Route exact path="/aggregate" component={Aggregate} />
                <Route exact path="/travista/:id" component={Travista} />
            </Switch>
        </main>
    );
}

export default Main;
