import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "../../pages/Home/Home";
import Source from "../../pages/Source/Source";
import TraceEvents from "../../pages/TraceEvents/TraceEvents"
import Dependency from "../../pages/Dependency/Dependency"

import "./Main.css";

function Main() {
    return (
        <main>
            <Switch>
                <Route exact path="/" component={Home} />
                <Route exact path="/source" component={Source} />
                <Route exact path="/trace" component={TraceEvents} />
                <Route exact path="/dependency" component={Dependency} />
            </Switch>
        </main>
    );
}

export default Main;
