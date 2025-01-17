//Exportacion de librerias necesarias
import express, { request, response } from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';


const app = express();
const PORT = 3500;

app.listen(PORT , () =>{
    console.log(`Servidor iniado en http://localhost:${PORT}`)
})

app.use(express.json())
app.use(express.urlencoded({extended: true }));

//Sesiones almacenadas en Memoria(RAM)
const sessions = {};

//funcion de utilidad que nos permitiera acceder a la informacion de la interfaz de red 

const getClientIP = (request) => {
    return (
        request.headers["x-forwarded-for"] || 
        request.connection.remoteAddress || 
        request.socket.remoteAddress || 
        request.connection.socket?.remoteAddress
    );
};


app.post('/login' , (request , response)=>{
    const{email,nickname, macaAddress}= request.body;

    if(!email || !nickname || !macaAddress){
        return response.status(400).json({message: "Se esperan campos requeridos"})
    }

    const sessionId = uuidv4();
    const now = new Date();

    session[sessionId] ={
        sessionId,
        email,
        nickname,
        macaAddress,
        ip : getClientIP(request),
        createAt: now ,
        lastAccesed: now
    };


    response.status(200).json({
        message : "Se ha logeado de manera exitosa",
        sessionId,
    });
}) ;


app.post("/logout", (request,response) =>{
    const {sessionId} = request.body;

    if(!sessionId || !sessions[sessionId]){
        return response.status(404).json({message: "No se ha encontrado una sesion activa"});
    }

    delete sessions[sessionId];
    request.session.destroy((err) =>{
        if(err){
            return response.status(500).send('Error al cerrar sesion')
        }
    })

    response.status(200).json({ message:"Logout successful"});
});
app.post("/update", (request,response)=>{
    const {sessionId, email , nickname} = request.body;

    if(!sessionId || !sessions[sessionId]){
        return response.status(404).json({message : "No existe una sesion activa"})
    }

    if (email) sessions[sessionId].email = email;
    if(nickname) sessions[sessionsId].nickname = nickname;
        IdleDeadline()
      sessions[sessionId].lastAcceses = newDate();

})

app.get("/status", (request,response)=>{
    const sessionId = request.query.sessionId;
    if(!sessionId || !sessions[sessionId]){
        response.response.status(404).json({message: "No hay q"
     })}

     response.status(200).json({
        message : "Sesion Activa",
        session: sessions[sessionId]
     })
})
