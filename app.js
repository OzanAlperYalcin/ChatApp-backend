const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: process.env.ORIGIN,
        methods: ["GET", "POST"],
        // allowedHeaders: ["my-custom-header"],
        // credentials: true
    }
})

let chatData = {
    rooms: {}
}

io.on('connection', (socket) => {

    socket.on('login', (user) => {
        const roomId = user.room
        user.id = socket.id
        socket.join(roomId)
        if (!chatData.rooms[roomId]) {
            chatData.rooms[roomId] = {
                name: roomId + ' Chat Grubu',
                users: [],
                messages: [],
                count: 0
            }
        }
        const room = chatData.rooms[roomId]
        room.users.length === 0 ? user.admin = true : user.admin = false
        room.users.push(user)
        room.count ++
        io.to(roomId).emit('users', {
            users: room.users,
            count: room.count,
            room: { name: room.name }
        })
    })

    socket.on('disconnect', () => {
        console.log(socket.id)
        const updatedData = { ...chatData }
        Object.keys(updatedData.rooms).forEach(roomId => {
            const room = updatedData.rooms[roomId]
            const index = room.users.findIndex(user => user.id === socket.id)
            if (index > -1) {
                room.users.splice(index, 1)
                room.count--
                if (room.users.length === 1) room.users[0].admin = true
                socket.to(roomId).emit('signout', { users: room.users, count: room.count })
            }
        })
        chatData = updatedData
    })

    socket.on('chat', (message) => {
        // chatData.rooms[room].messages.push(message)
        socket.to(message.room).emit('message', message)
    })

    socket.on('room', (roomData) => {
        const { name, roomId } = roomData
        socket.join(roomId)
        const updateData = { ...chatData }
        const room = updateData.rooms[roomId]
        room.name = name
        socket.to(roomId).emit('updateRoom', { name: room.name, room: roomId })
        chatData = updateData
        socket.leave(roomId)
    })

})

app.get('/', (req, res) => {
    res.send('Chat APP Rest API')
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
    console.log('Sunucu Çalışıyor.. Port: ' + PORT)
})
