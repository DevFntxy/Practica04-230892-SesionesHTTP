import express from 'express'
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors'; // Importar cors
import os from 'os';
import moment from 'moment-timezone'; // Importar moment-timezone

const app = express(); 
const PORT = 3500;
const MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

// Configuración de CORS
const corsOptions = {
    origin: ['http://localhost:3500', 'http://localhost:192.168.27.55'], // Dominios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
    credentials: true, // Permitir envío de cookies y credenciales
};

app.use(cors(corsOptions)); // Aplicar middleware de CORS

app.listen(PORT, () => {
    console.log("Servidor iniciado en http://localhost:${PORT}");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones almacenadas en Memoria (RAM)
const sessions = {};

app.use(
    session({
        secret: 'p4-DSC#XUGABOX-controldesesiones',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 }, // 5 minutos
    })
);

// Función de utilidad para obtener la IP del cliente
const getClientIP = (request) => {
    const ip =
        request.headers["x-forwarded-for"] || // IP detrás de un proxy
        request.connection.remoteAddress || 
        request.socket.remoteAddress || 
        request.connection.socket?.remoteAddress;

    // Convertir "::1" (IPv6) a "127.0.0.1" (IPv4)
    return ip === "::1" ? "127.0.0.1" : ip;
};

app.get('/', (request, response) => {
    return response.status(200).json({
        message: "Bienvenido al API de Control de Sesiones",
        author: "Derek Sesni"
    });
});

app.post('/login', (request, response) => {
    const { email, nickname, macaAddress } = request.body;

    if (!email || !nickname || !macaAddress) {
        return response.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionId = uuidv4();
    const now = moment.tz('America/Mexico_City'); // Hora actual en CDMX

    sessions[sessionId] = {
        sessionId,
        email,
        nickname,
        macaAddress,
        ip: getServerNetworkInfo(),
        createAt: now.format(), // Hora en formato ISO ajustada a CDMX
        lastAccesed: now.format(),
    };

    response.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionId,
    });
});

app.post("/logout", (request, response) => {
    const { sessionId } = request.body;

    if (!sessionId || !sessions[sessionId]) {
        return response.status(404).json({ message: "No se ha encontrado una sesión activa" });
    }

    delete sessions[sessionId];
    request.session.destroy((err) => {
        if (err) {
            return response.status(500).send("Error al cerrar sesión");
        }

        response.status(200).json({ message: "Logout successful" });
    });
});

app.post("/update", (request, response) => {
    const { sessionId, email, nickname } = request.body;

    if (!sessionId || !sessions[sessionId]) {
        return response.status(404).json({ message: "No existe una sesión activa" });
    }

    if (email) sessions[sessionId].email = email;
    if (nickname) sessions[sessionId].nickname = nickname;

    // Actualizar lastAccesed aquí
    sessions[sessionId].lastAccesed = moment.tz('America/Mexico_City').format();

    response.status(200).json({
        message: "Sesión actualizada correctamente",
        session: sessions[sessionId],
    });
});

app.get("/status", (request, response) => {
    const sessionId = request.query.sessionId;

    if (!sessionId || !sessions[sessionId]) {
        return response.status(404).json({ message: "No hay sesión activa" });
    }

    const session = sessions[sessionId];
    const now = moment.tz('America/Mexico_City'); // Hora actual en CDMX
    const createdAt = moment(session.createAt);
    const lastAccessedAt = moment(session.lastAccesed);

    const totalDuration = moment.duration(now.diff(createdAt));
    const inactivity = moment.duration(now.diff(lastAccessedAt));

    if (totalDuration.asMilliseconds() > MAX_SESSION_DURATION) {
        // Eliminar la sesión si ha expirado
        delete sessions[sessionId];
        return response.status(401).json({ message: "La sesión ha expirado" });
    }

    // No actualizar lastAccesed aquí

    response.status(200).json({
        message: "Sesión activa.",
        session: {
            sessionId: session.sessionId,
            email: session.email,
            nickname: session.nickname,
            macAddress: session.macaAddress,
            ip: session.ip,
            createdAt: session.createAt,
            lastAccessedAt: session.lastAccesed,
            inactivity: `${Math.floor(inactivity.asMinutes())} minutos y ${inactivity.seconds()} segundos`,
            totalDuration: `${Math.floor(totalDuration.asHours())} horas, ${totalDuration.minutes()} minutos y ${totalDuration.seconds()} segundos`,
     },
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
            macAddress: session.macaAddress,
            ip: session.ip,
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


const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { serverIP: iface.address, serverMac: iface.mac };
            }
        }
    }
};