const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// User management
let waitingUsers = []; // Array of { socketId, gender, interests }
const activePairs = new Map(); // socketId -> partnerSocketId
const userPreferences = new Map(); // socketId -> { gender, interests }
const reportedUsers = new Map(); // socketId -> { count, lastReport }
const bannedIPs = new Map(); // IP -> banUntil timestamp

// Broadcast user count to all connected clients
function broadcastUserCount() {
    const onlineCount = io.engine.clientsCount;
    const waitingCount = waitingUsers.length;
    io.emit('user_count_update', { online: onlineCount, waiting: waitingCount });
}

// Smart matching algorithm
function findMatch(socket, preferences) {
    if (waitingUsers.length === 0) return null;

    // If no preferences, match with anyone
    if (!preferences || !preferences.gender) {
        return waitingUsers.shift();
    }

    // Try to find a match with compatible preferences
    for (let i = 0; i < waitingUsers.length; i++) {
        const waitingUser = waitingUsers[i];
        const waitingPrefs = userPreferences.get(waitingUser.socketId);

        // Check gender compatibility
        if (preferences.gender && waitingPrefs && waitingPrefs.gender) {
            if (preferences.gender !== 'any' && waitingPrefs.gender !== 'any') {
                if (preferences.gender !== waitingPrefs.gender) {
                    continue; // Skip if genders don't match
                }
            }
        }

        // Check interest compatibility (at least one common interest)
        if (preferences.interests && preferences.interests.length > 0 &&
            waitingPrefs && waitingPrefs.interests && waitingPrefs.interests.length > 0) {
            const hasCommonInterest = preferences.interests.some(interest =>
                waitingPrefs.interests.includes(interest)
            );
            if (!hasCommonInterest) {
                continue; // Skip if no common interests
            }
        }

        // Found a match!
        return waitingUsers.splice(i, 1)[0];
    }

    // No perfect match found, match with first available
    return waitingUsers.shift();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    broadcastUserCount();

    // Check if IP is banned
    const clientIP = socket.handshake.address;
    if (bannedIPs.has(clientIP)) {
        const banUntil = bannedIPs.get(clientIP);
        if (Date.now() < banUntil) {
            socket.emit('banned', { until: banUntil });
            socket.disconnect();
            return;
        } else {
            bannedIPs.delete(clientIP);
        }
    }

    socket.on('set_preferences', (preferences) => {
        userPreferences.set(socket.id, preferences);
        console.log(`User ${socket.id} set preferences:`, preferences);
    });

    socket.on('find_partner', () => {
        // If user is already waiting, don't add again
        if (waitingUsers.some(u => u.socketId === socket.id)) return;

        const preferences = userPreferences.get(socket.id);
        const match = findMatch(socket, preferences);

        if (match) {
            const partnerId = match.socketId;

            if (partnerId === socket.id) return;

            // Register pair
            activePairs.set(socket.id, partnerId);
            activePairs.set(partnerId, socket.id);

            // Notify initiator (current socket) to call partner
            socket.emit('partner_found', partnerId);

            console.log(`Paired ${socket.id} with ${partnerId}`);
            broadcastUserCount();
        } else {
            waitingUsers.push({ socketId: socket.id, ...preferences });
            console.log(`User ${socket.id} added to waiting queue`);
            broadcastUserCount();
        }
    });

    socket.on('call_user', ({ userToCall, signalData, from }) => {
        io.to(userToCall).emit('call_made', { signal: signalData, from });
    });

    socket.on('answer_call', ({ signal, to }) => {
        io.to(to).emit('call_accepted', signal);
    });

    socket.on('send_message', (message) => {
        const partnerId = activePairs.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('message_received', message);
        }
    });

    socket.on('report_user', ({ reason }) => {
        const partnerId = activePairs.get(socket.id);
        if (partnerId) {
            const reportData = reportedUsers.get(partnerId) || { count: 0, lastReport: 0 };
            reportData.count++;
            reportData.lastReport = Date.now();
            reportedUsers.set(partnerId, reportData);

            console.log(`User ${partnerId} reported by ${socket.id}. Reason: ${reason}. Total reports: ${reportData.count}`);

            // Temporary ban after 3 reports
            if (reportData.count >= 3) {
                const partnerSocket = io.sockets.sockets.get(partnerId);
                if (partnerSocket) {
                    const partnerIP = partnerSocket.handshake.address;
                    const banUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
                    bannedIPs.set(partnerIP, banUntil);
                    partnerSocket.emit('banned', { until: banUntil });
                    partnerSocket.disconnect();
                    console.log(`User ${partnerId} (IP: ${partnerIP}) temporarily banned until ${new Date(banUntil)}`);
                }
            }

            // Notify reporter
            socket.emit('report_submitted');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Remove from waiting queue
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);

        // Remove preferences
        userPreferences.delete(socket.id);

        // Notify partner
        const partnerId = activePairs.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('partner_disconnected');
            activePairs.delete(partnerId);
            activePairs.delete(socket.id);
        }

        broadcastUserCount();
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
