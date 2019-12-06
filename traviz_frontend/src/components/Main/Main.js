import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "../../pages/Home/Home";
import HomeCopy from "../../pages/HomeCopy/HomeCopy";
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
                <Route exact path="/trace/:id" component={TraceEvents} />
                <Route exact path="/dependency" component={Dependency} />
                <Route exact path="/search" component={HomeCopy} />
            </Switch>
        </main>
    );
}

export default Main;
