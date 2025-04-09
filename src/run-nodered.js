import http from 'http';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import RED from '../node_modules/node-red/lib/red.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // Create the settings object - see default settings.js file for other options
        var settings = {
            httpAdminRoot: inputs?.adminPath || "/admin",
            httpNodeRoot: inputs?.nodePath || "/",
            userDir:".",
            httpStatic:"public",
            contextStorage: {
                default: {
                    module:"localfilesystem",
                    config: {
                        dir: "context"
                    }
                }
            },
            editorTheme: {
                projects: {
                    enabled: true
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