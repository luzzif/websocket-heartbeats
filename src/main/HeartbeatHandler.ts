import * as WebSocket from "ws";
import {isNullOrUndefined} from "util";
import Timer = NodeJS.Timer;

/**
 * Actively handles the heartbeat ping/pong mechanism respecting
 * the specified parameters.
 */
export class HeartbeatHandler {

    private readonly STATE_OPEN: number = 1;
    private readonly STATE_CLOSED: number = 3;

    private websocket: WebSocket;
    private pingInterval: number;
    private onDeath: () => any;
    private alive: boolean;

    /**
     * Default constructor.
     *
     * @param websocket    The web socket instance on which we want to
     *                     perform the checks and start the monitoring.
     * @param pingInterval The interval between which ping/pong messages
     *                     are exchanged between client and server
     *                     (defaults to 1 minute).
     * @param onDeath      Callback called on client/server connection end,
     *                     detected from missing heartbeat updates.
     */
    constructor(
        websocket: WebSocket,
        pingInterval: number,
        onDeath?: () => any ) {

        this.websocket = websocket;
        this.pingInterval = pingInterval;
        this.onDeath = onDeath;
        this.alive = true;

    }

    /**
     * Does some basic checks about the web socket state and starts
     * the actual heartbeat monitoring.
     */
    public handle(): void {

        this.websocket.on( "pong", () => {
            this.alive = true;
        } );

        if( this.websocket.readyState !== this.STATE_OPEN ) {

            this.websocket.on( "open", () => {
                this.handleHeartbeat();
            } );
            return;

        }
        this.handleHeartbeat();

    }

    /**
     * Implements the business logic required for the heartbeat detection to work.
     * If the heartbeat stops respecting the previously-set timeout, the client/server
     * connection is considered dead and the eventually passed in callback is called.
     * The web socket is also closed with code 1008 (policy violation) and message
     * "Heartbeat stopped".
     */
    private handleHeartbeat(): void {

        let timer: Timer = setInterval( () => {

            if( this.websocket.readyState === this.STATE_CLOSED ) {
                clearInterval( timer );
                return;
            }
            if( !this.alive ) {

                if( !isNullOrUndefined( this.onDeath ) ) {
                    this.onDeath();
                }
                this.websocket.terminate();
                clearInterval( timer );
                return;

            }

            this.alive = false;
            this.websocket.ping();

        }, this.pingInterval );

    }

}