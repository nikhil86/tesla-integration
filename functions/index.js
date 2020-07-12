const functions = require('firebase-functions');
const tjs = require('teslajs');
const credentials = require('./credentials');

 const username = credentials.USERNAME;
const password = credentials.PASSWORD;

function f2c(degf) {
 return (degf - 32) * 5 / 9;
}

function createDelay(timeLimit) {
 return new Promise(resolve => setTimeout(resolve, timeLimit));
}

async function setTemp(options) {
 console.log('attempting to start climate set');
 const climateResult = await tjs.climateStartAsync(options);
 console.log(JSON.stringify(climateResult));
 
 console.log('attempting to start temperature set');
 const tempSetResult = await tjs.setTempsAsync(options, f2c(69), f2c(69));
 console.log(JSON.stringify(tempSetResult));

 // disable seat heater cuz its summer !!
 // console.log('attempting to start seat heater');
 // const seatHeatResult = await tjs.seatHeaterAsync(options,0,3);
 // console.log(JSON.stringify(seatHeatResult));
}

function attemptToWakeUp(options) {
 return tjs.wakeUpAsync(options);
}

exports.teslaWarmUp = functions.https.onRequest((request, response) => {
  tjs.login(username, password, async (err, result) => {
   if (err) {
    response.send("failed login!");
   }
   if (result.error) {
    response.send(JSON.stringify(result.error));
   }
   
   try {
    const vehicle = await tjs.vehicleAsync({ authToken: result.authToken });
    //return 200 response instead of making the client wait
    response.send(200);

    console.log(JSON.stringify(vehicle));
    const options = { authToken: result.authToken, vehicleID: vehicle.id_s };
 
    if (vehicle.state === 'asleep') {
     console.log('vehicle is asleep. First attempt to wake it up');
     const attemptOne = await attemptToWakeUp(options);
     await createDelay(5000);
     
     if (attemptOne.state === 'asleep') {
      console.log('vehicle is asleep. Second attempt to wake it up');
      const attemptTwo = await attemptToWakeUp(options);
      await createDelay(5000);
      
      if (attemptTwo.state === 'asleep') {
       console.log('vehicle is asleep. Third attempt to wake it up');
       const attemptThree = await attemptToWakeUp(options);
       await createDelay(5000);
       
       if (attemptThree.state === 'asleep') {
        const attemptFour = await attemptToWakeUp(options);
        await createDelay(5000);
 
        if (attemptFour.state === 'asleep') {
         console.log('vehicle failed to wake up after four attempts');
         return response.send(500);
        } else {
         await setTemp(options);
        }
       } else {
        console.log('climate set initiated');
        await setTemp(options);
       }
      } else {
       await setTemp(options);
      }
     } else {
      await setTemp(options);
     }
    } else {
     await setTemp(options);
    }
    
   } catch(e) {
    console.log('some error happened');
    console.log(e);
    response.send(500);
   }
  });
});
