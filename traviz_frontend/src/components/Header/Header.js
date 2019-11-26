import React from "react";
import './Header.css';

function Header() {
    return (
        <header>
            <ul>
                <li><a href="/" class="navbar"><h1>TraViz </h1></a></li>
                <li><a href="/source" class="navbar"><h2>Source </h2></a></li>
                <li><a href="/dependency" class="navbar"><h2>Dependency </h2></a></li>
            </ul>
        </header>
    );
}

export default Header;
