import express, { request, response } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors'; // Importar cors
import os from 'os';

const app = express();
const PORT = 3500;

// Configuración de CORS
const corsOptions = {
    origin: ['http://localhost:3500','http://localhost:192.168.27.55' ], // Dominios permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas
    credentials: true, // Permitir envío de cookies y credenciales
};

app.use(cors(corsOptions)); // Aplicar middleware de CORS

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
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

app.get('/' ,(request, response) => {
    return response.status(200).json({message : "Bienvenido al API de Control de Sesiones",  author: "Derek Sesni" })
})

app.post('/login', (request, response) => {
    const { email, nickname, macaAddress } = request.body;

    if (!email || !nickname || !macaAddress) {
        return response.status(400).json({ message: "Se esperan campos requeridos" });
    }

    const sessionId = uuidv4();
    const now = new Date();

    sessions[sessionId] = {
        sessionId,
        email,
        nickname,
        macaAddress,
        ip: getServerNetworkInfo(),
        createAt: now,
        lastAccesed: now,
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

    sessions[sessionId].lastAccesed = new Date();

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

    response.status(200).json({
        message: "Sesión activa",
        session: sessions[sessionId],
    });
});

app.get('/listCurrentSessions', (request, response) => {
    // Si no hay sesiones activas
    if (Object.keys(sessions).length === 0) {
        return response.status(404).json({ message: "No hay sesiones activas" });
    }

    // Devolver todas las sesiones activas
    response.status(200).json({
        message: "Sesiones activas",
        sessions: Object.values(sessions), // Convertimos el objeto de sesiones a un array
    });
});


const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces()
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal ){
                return{serverIP: iface.address, serverMac: iface.mac}
            }
        }
    }
}

