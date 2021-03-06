import React, {useMemo, useEffect, useState, Fragment} from "react";
import ReactDOM from "react-dom";
import {d} from "../app/helper/helper";
import {Content, Stack, Grid, Overlays, Overlay} from "./components/LayoutComponents";
import {getExamples} from "./generated/LayoutExamples";

function explode(input, separator, limit = null) {
    if (limit === null) {
        return input.split(separator);
    }
    const output = input.split(separator, limit - 1);
    const found = output.join(separator);

    if (found.length < input.length) {
        output.push(input.substr(found.length + separator.length));
    }
    return output;
}

function getComponentsHighlighted(code) {
    const result = [];
    const lines = code.split('&lt;');
    let first = true;
    for (let line of lines) {
        if (first) {
            first = false;
            result.push(line);
            continue;
        }
        if (!line.match(/^(\/)?[A-Z]/)) {
            result.push('&lt;' + line);
            continue;
        }
        const parts = explode(line, '&gt;', 2);
        const tagParts = explode(parts[0], ' ', 2);
        let prefix = '';
        if (tagParts.length === 2) {
            prefix = ' ' + tagParts[1];
            parts[0] = tagParts[0];
        }
        let closer = '';
        if (parts[0][0] === '\/') {
            closer = '/';
            parts[0] = parts[0].substr(1);
        }
        result.push('<span class="highlight">&lt;' + closer + '<b>' + parts[0] + '</b>' + prefix +  '&gt;</span>' + parts[1]);
    }
    return result.join('');
}

function postData(name, data = {}) {
    return fetch('http://localhost:8080/' + name, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            console.error('failed...');
            throw Error('BOOM!');
        }
        return response.json();
    });
}

function LayoutApp() {

    const [showCode, setShowCode] =  useState(true);
    const [width, setWidth] = useState(400);
    const [height, setHeight] = useState(300);

    useEffect(() => {
        const elem = document.getElementById('examples');
        elem.classList.toggle('hidden');
        setShowCode(true);
    }, []);

    const examples = useMemo(() => getExamples(), []);

    const tree = useMemo(() => {
        const examplesElem = document.getElementById('examples');

        if (!examplesElem) {
            throw Error('No root elem "examples" found!');
        }

        const tree = [];
        for(let child of examplesElem.children) {
            if (child.nodeName !== 'LI') {
                console.log('Skipping wrong top level LI', child);
                continue;
            }
            const category = child.childNodes[0].textContent.trim();
            for (let subChild of child.children[0].children) {
                const description = subChild.childNodes[0].textContent.trim();
                const stackElem = subChild.children[0];
                const raw = stackElem.children[0].innerHTML;
                let code = stackElem.children[1].innerHTML;
                const codeRaw = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<br>/g, '<br />');
                tree.push({category, description, raw, code, codeRaw});
            }
        }
        return tree;
    });

    const getComponent = (no) => {
        if (no >= examples.length) {
            return <div style={{color: 'red'}}>Example missing!</div>;
        }
        return examples[no];
    };

    const getMarkUp = () => {
        const result = [];
        let no = 0;
        let lastCategory = null;
        for (let item of tree) {
            let header = '';
            if (lastCategory !== item.category) {
                header += '<h1>' + item.category + '</h1><hr />';
                lastCategory = item.category;
            }
            header += '<h3>' + item.description + '</h3>';

            const dim = {width, height, minWidth: width, minHeight: height};

            result.push(
                <Fragment key={no}>
                    <div dangerouslySetInnerHTML={{__html: header}}></div>
                    <div className="stack-h inner-space-h">
                        <div className="fix-screen" style={dim} dangerouslySetInnerHTML={{__html: item.raw}}></div>
                        {showCode ?
                            <pre dangerouslySetInnerHTML={{__html: getComponentsHighlighted(item.code)}}></pre> :
                            <div className="fix-screen" style={dim}>{getComponent(no)}</div>
                        }
                    </div>
                </Fragment>
            );
            no++;
        }

        let n = 0;
        const vsItems = [
            <Stack full="v" padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack full="h" padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack full padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack full padded gap flex className="bg1">
                <Content flex padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,

            <Stack vertical full="v" padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack vertical full="h" padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack vertical padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack vertical full padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>,
            <Stack vertical full padded gap flex className="bg1">
                <Content flex padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>
        ];


        result.push(
            <Fragment key="add">
                <hr />
                <h1>Direct VS indirect</h1>
                <hr />
                    {
                        vsItems.map((item, no) =>
                            <div key={no} className="stack-h inner-space-h">
                                <div className="fix-screen">
                                    <Stack full gap>
                                        <Content width={100}>Eins</Content>
                                        {item}
                                    </Stack>
                                </div>

                                <div className="fix-screen">
                                    <Stack full gap>
                                        <Content width={100}>Eins</Content>
                                        <Content full="h">{item}</Content>
                                    </Stack>
                                </div>
                            </div>
                        )
                    }
            </Fragment>
        );
        return result
    };

    const regenerate = () => {
        let code = "import React from \"react\";\n" +
            "import {Content, Stack, Grid, Overlays, Overlay} from \"../components/LayoutComponents\";\n" +
            "function Canvas() { return <div></div> };\n" +
            "\n" +
            "function getExamples() {\n" +
            "    const examples = [];\n";
        for (let item of tree) {
            code += "    examples.push(\n";
            code += item.codeRaw + "\n";
            code += "    );\n";
        }
        code += "    return examples;\n" +
            "}\n" +
            "\n" +
            "export {getExamples};" +
            "/*\n" +
            "RESCUE CODE:\n" +
            "\n" +
            "import React from \"react\";\n" +
            "import {Content, Stack, Grid, Overlays, Overlay} from \"../components/LayoutComponents\";\n" +
            "\n" +
            "function getExamples() {\n" +
            "    return [];\n" +
            "}\n" +
            "\n" +
            "export {getExamples};\n" +
            " */"
        postData('setExamples', {code}).then(response => {
            window.location.reload();
        });
    };

    return (
        <div className="full-h full-v content">
            <div className="stack-h full-v full-h boxed inner-border-h max-h max-v">
                <div className="content scroll max-h max-v padded flex">
                    {getMarkUp()}
                </div>
                <div className="padded">
                    <div><button onClick={regenerate}>Regenerate</button></div>
                    <div>Show code<input type="checkbox" onChange={e => setShowCode(e.target.checked)} checked={!!showCode} /></div>
                    <div>Width: <input type="range" min={1} max={1000} value={width} onChange={e => setWidth(parseInt(e.target.value, 10))} /></div>
                    <div>Height: <input type="range" min={1} max={1000} value={height} onChange={e => setHeight(parseInt(e.target.value, 10))} /></div>
                </div>
            </div>
        </div>
    )
}

ReactDOM.render(
    <LayoutApp />,
    document.getElementById('app')
);