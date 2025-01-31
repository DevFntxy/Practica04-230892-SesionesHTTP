import express from 'express';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import os from 'os';
import moment from 'moment-timezone';

const app = express();
const PORT = 3500;
const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

// Configuración de CORS
const corsOptions = {
    origin: ['http://localhost:3500', 'http://localhost:192.168.27.55'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = {};

app.use(
    session({
        secret: 'p4-DSC#XUGABOX-controldesesiones',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 },
    })
);

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

// Obtener la IP y MAC del cliente
const getClientIP = (request) => {
    const ip =
        request.headers["x-forwarded-for"] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket?.remoteAddress;

    return ip === "::1" ? "127.0.0.1" : ip;
};

// Obtener la IP y MAC del servidor
const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { serverIP: iface.address, serverMac: iface.mac };
            }
        }
    }
    return { serverIP: "0.0.0.0", serverMac: "00:00:00:00:00:00" };
};

app.post('/login', (request, response) => {
    const { email, nickname, macAddress } = request.body; // `macAddress` del cliente enviada en el request

    if (!email || !nickname || !macAddress) {
        return response.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionId = uuidv4();
    const now = moment.tz('America/Mexico_City');
    const { serverIP, serverMac } = getServerNetworkInfo();

    sessions[sessionId] = {
        sessionId,
        email,
        nickname,
        clientMacAddress: macAddress,  // Guardamos la MAC del cliente
        clientIP: getClientIP(request),
        serverIP,
        serverMacAddress: serverMac,  // Guardamos la MAC del servidor
        createAt: now.format(),
        lastAccesed: now.format(),
    };

    response.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionId,
    });
});

app.get('/listCurrentSessions', (request, response) => {
    if (Object.keys(sessions).length === 0) {
        return response.status(404).json({ message: "No hay sesiones activas" });
    }

    const now = moment.tz('America/Mexico_City');

    const activeSessions = Object.values(sessions).map(session => {
        const createdAt = moment(session.createAt);
        const lastAccessedAt = moment(session.lastAccesed);

        const totalDuration = moment.duration(now.diff(createdAt));
        const inactivity = moment.duration(now.diff(lastAccessedAt));

        return {
            sessionId: session.sessionId,
            email: session.email,
            nickname: session.nickname,
            clientMacAddress: session.clientMacAddress, 
            clientIP: session.clientIP,
            serverMacAddress: session.serverMacAddress,
            serverIP: session.serverIP,
            createdAt: session.createAt,
            lastAccessedAt: session.lastAccesed,
            inactivity: `${Math.floor(inactivity.asMinutes())} minutos y ${inactivity.seconds()} segundos`,
            totalDuration: `${Math.floor(totalDuration.asHours())} horas, ${totalDuration.minutes()} minutos y ${totalDuration.seconds()} segundos`,
        };
    });

    response.status(200).json({
        message: "Sesiones activas",
        sessions: activeSessions,
    });
});
