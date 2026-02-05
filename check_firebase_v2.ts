
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDPdTOcEUpptT7fY7jB6egxUy4o6hYg0Go",
    authDomain: "pit-stop-lavacar.firebaseapp.com",
    projectId: "pit-stop-lavacar",
    storageBucket: "pit-stop-lavacar.firebasestorage.app",
    messagingSenderId: "397716130984",
    appId: "1:397716130984:web:bb7938c9e035fa4bf1c69d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log('--- Checking Firebase Collections ---');
    try {
        const services = await getDocs(collection(db, 'services'));
        console.log('Services Count:', services.size);
        services.forEach(doc => {
            const data = doc.data();
            console.log(` - [${doc.id}] ${data.name} (Active: ${data.active})`);
        });

        const appointments = await getDocs(collection(db, 'appointments'));
        console.log('Appointments Count:', appointments.size);

        const config = await getDocs(collection(db, 'config'));
        console.log('Config Docs Count:', config.size);
        config.forEach(doc => console.log(` - config/${doc.id}`));

        process.exit(0);
    } catch (err) {
        console.error('Error checking firebase:', err);
        process.exit(1);
    }
}

check();
