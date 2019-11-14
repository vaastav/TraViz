import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "../../pages/Home/Home";

import "./Main.css";

function Main() {
    return (
        <main>
            <Switch>
                <Route exact path="/" component={Home} />
            </Switch>
        </main>
    );
}

export default Main;
