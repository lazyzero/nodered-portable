import http from 'http';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import RED from '../node_modules/node-red/lib/red.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prüfe wichtige Verzeichnisse
try {
    const nodeRedDir = path.join(__dirname, '..', 'node_modules', 'node-red');
    const nodeRedNodesDir = path.join(__dirname, '..', 'node_modules', '@node-red', 'nodes');
    const nodeRedExamplesDir = path.join(__dirname, '..', 'node_modules', '@node-red', 'nodes', 'examples');
    
    console.log('Node-RED Verzeichnis existiert:', fs.existsSync(nodeRedDir));
    console.log('Node-RED Nodes Verzeichnis existiert:', fs.existsSync(nodeRedNodesDir));
    console.log('Node-RED Examples Verzeichnis existiert:', fs.existsSync(nodeRedExamplesDir));
} catch (error) {
    console.error('Fehler beim Prüfen der Verzeichnisse:', error);
}

const runNodeRed = function() {
    let inputs;
    // Check if this file is run directly
    if (import.meta.url === `file://${process.argv[1]}`) {
        inputs = {};
        startNodeRED();
    } else {
        const WSv = new WebSocketServer({port: 50820});
        let socket;
        WSv.on('connection', function(s) {
            socket = s;
            // When you receive a message, send that message to every socket.
            socket.on('message', function(msg) {
                inputs = JSON.parse(msg);
            });

            // Only start NR on websocket close
            socket.on('close', function() {
                startNodeRED();
            });
        });
    }

    function startNodeRED(){
        // Create an Express app
        var app = express();
        
        // Create a server
        var REDserver = http.createServer(app);

        // Prüfe, ob der Beispielknoten-Ordner existiert
        const examplesDir = path.join(__dirname, '..', 'node_modules', '@node-red', 'nodes', 'examples');
        const examplesDirExists = fs.existsSync(examplesDir);
        
        // Create the settings object - see default settings.js file for other options
        var settings = {
            httpAdminRoot: inputs?.adminPath || "/admin",
            httpNodeRoot: inputs?.nodePath || "/",
            userDir:".",
            httpStaticRoot:"/static/",
            contextStorage: {
                default: {
                    module:"localfilesystem",
                    config: {
                        dir: "context"
                    }
                }
            },
            // Deaktiviere die Beispielknoten, wenn das Verzeichnis nicht existiert
            nodesExcludes: examplesDirExists ? [] : ['@node-red/nodes/examples/**'],
            // Kombiniere alle Editor-Theme-Einstellungen
            editorTheme: {
                projects: {
                    enabled: true
                },
                palette: {
                    editable: true
                }
            }
        };

        // Initialise the runtime with a server and settings
        RED.init(REDserver,settings);
        
        // Add a simple route for static content served from 'public'
        app.use("/",express.static(settings.httpStatic));
        // Serve the editor UI from /red
        app.use(settings.httpAdminRoot,RED.httpAdmin);
        // Serve the http nodes UI from /api
        app.use(settings.httpNodeRoot,RED.httpNode);
        
        REDserver.listen(inputs?.port || 1880);
        
        // Start the runtime
        RED.start();
    }
};

// If this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runNodeRed();
}

export default runNodeRed;
