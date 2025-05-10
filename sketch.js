
// Conway's Game Of Life with Hand Detection (ml5.js library)

let grid; // grid stores the cells
let cols; // number of columns
let rows; // number of rows
let resolution = 15; // the size of each square cell, this creates the organic forms

//motion effects
let motionDetected = false; // it becomes true when motion is detected 
let lastMotionTime = 0; // when was the last motion 
let motionEffectDuration = 5000; // how long the effect lasts (5 seconds)
let blobVariation = 4.2; // how blobby the blobs are

// hand detection stuff I learned from a youtube tutorial called The Coding Train, LLM helped refine 
let video;
let handposeModel;
let hands = [];
let handDetected = false;
let lastHandPosition = { x: 0, y: 0 }; // where the hand was last time
let handConfidenceThreshold = 0.7; //number suggested by the tutorial
let handCooldown = 0;
let handDetectionReady = false;
let modelLoadingStarted = false;


let debugHand = false; // this was in the tutorial I followed

function setup() {
  // make canvas as big as the window
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 255); 
  
  
  video = createCapture(VIDEO); //starts the camera 
  video.size(640, 480);
  video.hide(); // hide the actual video element
  
  // Calculate the grid size based on resolution 
  cols = Math.floor(width / resolution); //math.floor rounds down to the nearest whole number
  rows = Math.floor(height / resolution);
  

  if (cols <= 0)cols = 1; //making sure there are no 0 rows or columns 
  if (rows <= 0)rows = 1;
  
  
  grid = make2DArray(cols, rows); //create the grid to store each cells 
  
  // This loads the handpose when video is ready, the tutorial helped code this part 
  video.elt.onloadeddata = function() {
    if (!modelLoadingStarted) {
      console.log("Video is working! Loading hand tracker...");
      modelLoadingStarted = true;
      
      handposeModel = ml5.handpose(video, modelIsReady); //getting the ml5 handpose library 
      
      handposeModel.on('predict', results => { 
        hands = results;
      });
    }
  };
  
 
  fillGridWithRandomStuff(); // fillong the grid
}

//function is called when the hand model is ready 
function modelIsReady() {
  console.log("Hand model is working"); 
  handDetectionReady = true;
}

//makes a fresh random grid
function fillGridWithRandomStuff() {
  
  for (let i = 0; i < cols; i++) { // go through every cell, looping
    for (let j = 0; j < rows; j++) {
      grid[i][j] = floor(random(2)); //randomly make the grid either 0 or1 
    }
  }
}


function make2DArray(cols, rows) { //making 2D array 
  cols = Math.max(1, cols); // at least 1 column
  rows = Math.max(1, rows); // at least 1 row
  

  let arr = new Array(cols);  // create the array
  for (let i = 0; i < cols; i++) {
    arr[i] = new Array(rows);
    for (let j = 0; j < rows; j++) { // fill with zeroes
      arr[i][j] = 0;
    }
  }
  return arr;
}

function makeMotionEffect(x, y) { // function runs only when it detects hand motion 
  motionDetected = true; // turn on the motion effect
  lastMotionTime = millis(); // store the time
  
  // make sure which grid cell the hand is over
  let i = floor(x / resolution);
  let j = floor(y / resolution);
  
  if (i >= 0 && i < cols && j >= 0 && j < rows) {
    // Make the cell alive
    grid[i][j] = 1;
    
    // add random cells around the hand 
    for (let n = 0; n < 15; n++) {
      // This adds cells in a 11x11 area around the hand
      let ni = i + floor(random(-5, 6)); 
      let nj = j + floor(random(-5, 6));
      
      // check if we are on the grid or not, this part was refined by LLM
      if (ni >= 0 && ni < cols && nj >= 0 && nj < rows) {
        grid[ni][nj] = 1; // make the cell alive
      }
    }
  }
}

// adding random cells 
function addSomeRandomCells(howMany) {
  for (let n = 0; n < howMany; n++) {
  
    let i = floor(random(cols));//pick random cell 
    let j = floor(random(rows));
    grid[i][j] = 1; // make the cell alive
  }
}


function drawBlobShape(x, y, size) { //drawing a blob 
  push(); // save the drawing state
  translate(x, y); // move to the center
  
//color change 
  if (motionDetected) {
    fill(120, 230, 220); // green when motion detected
  } else { 
    fill(0, 0, 255); // white normally
  }
  
  stroke(0, 40);
  strokeWeight(0.5);
  
  //used beginshape to make the blobs as organic as possible, LLM helped refine this too since I am not well versed on using cos and sin to draw 

  beginShape();
  for (let i = 0; i < 12; i++) {
    let angle = map(i, 0, 12, 0, TWO_PI);
    
    //random blob, I don't fully understand this part 
    let blobSize = size/2 + random(-size/4, size/4);
    let px = blobSize * cos(angle);
    let py = blobSize * sin(angle);
    
    curveVertex(px, py);
    if (i == 0) {
      curveVertex(px, py);
    }
    
    if (i == 11) {
      curveVertex(px, py);
    }
  }
  endShape(CLOSE);
  pop(); 
}

// making sure the circle is drawn when hand is detected 
function drawRedCircleForHand(x, y) {
  push(); 
  noFill();
  stroke(0, 200, 200); 
  strokeWeight(2);
  ellipse(x, y, 50, 50);

  fill(0, 200, 200);
  noStroke();
  ellipse(x, y, 10, 10);
  
  pop();
}

// Check if a hand is detected and handle it
function lookForHands() {
  if (!handDetectionReady) {
    return; // exit the function if not ready
  }
  
  try {

    //when no hand is detected 
    if (hands.length === 0) {
      handDetected = false;
      return;
    }
  
    const hand = hands[0];
    
    //since my hand detection didn't work properly, had to make sure the hand detection is complete enough or not, used LLM to help refine this bit 
    if (!hand || !hand.landmarks || !Array.isArray(hand.landmarks) || hand.landmarks.length < 9) {
      console.log("Hand data looks weird:", hand);
      handDetected = false;
      return;
    }
    
//check if the hand detection is good enough
    let confidence = 0;
    if (typeof hand.handInViewConfidence === 'number') {
      confidence = hand.handInViewConfidence;
    } else if (hand.score) {
      confidence = hand.score;
    }
    
    // If confidence is too low, ignore this hand
    if (confidence < handConfidenceThreshold) {
      handDetected = false;
      return;
    }
    
    
    handDetected = true;
    
    // Get the position of the index finger tip (point 8 in landmarks)
    const fingerTip = hand.landmarks[8];
    
    // Convert the position from video coordinates to canvas coordinates
    const handX = map(fingerTip[0], 0, video.width, 0, width);
    const handY = map(fingerTip[1], 0, video.height, 0, height);
    
    // Calculate how far the hand has moved
    const howFarMoved = dist(handX, handY, lastHandPosition.x, lastHandPosition.y);
    
    // If hand has moved enough and we're not in cooldown, trigger effect
    if (howFarMoved > 30 && frameCount > handCooldown) {
      makeMotionEffect(handX, handY); // do the cool effect!
      handCooldown = frameCount + 15; // wait a bit before next trigger
    }
    
    // draw the hand redcircle 
    drawRedCircleForHand(handX, handY);
    
    //remember the position of the hand
    lastHandPosition.x = handX;
    lastHandPosition.y = handY;
    
    
  } catch (error) {
    console.error("Error with hand tracking:", error); //when hand tracking isn't working
  }
}


function draw() {
  background(0); // black background
  

  if (handDetectionReady) {
    lookForHands();
  }
  
  // turns off the motion detection when there is no motion detected 
  if (motionDetected && millis() - lastMotionTime > motionEffectDuration) {
    motionDetected = false;
  }
  
//draw all cells as blobls
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      
      if (i < grid.length && j < grid[i].length && grid[i][j] == 1) {
        let x = i * resolution;
        let y = j * resolution;
     

//draw a blob for each living cell 
        drawBlobShape(x + resolution/2, y + resolution/2, resolution * 1.5);
      }
    }
  }
  
//simple instructions for the user 
  fill(255);
  textSize(14);
  text("Move your hand in front of the camera to make cool effects!!!", 10, 20);
  
 //show loading when the hand detection is getting ready 
  if (!handDetectionReady) {
    // Darken the whole screen
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    // Show loading text
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("LOADING... Please wait!", width/2, height/2 - 40);
    
  
    textSize(16);
    text("This might take a few seconds. Please allow camera access when asked.", width/2, height/2);
    text("Make sure you're using Chrome or Firefox!", width/2, height/2 + 30);
    
    //spinning loading circle
    push();
    translate(width/2, height/2 + 80);
    rotate(frameCount * 0.1); // make it spin
    noFill();
    stroke(255);
    strokeWeight(4);
    arc(0, 0, 40, 40, 0, PI + HALF_PI);
    pop();
    
    
    textAlign(LEFT, BASELINE);
  }
  
  // GAME OF LIFE RULES!!!!

  let nextGrid = make2DArray(cols, rows);
  
 
  for (let i = 0; i < cols; i++) { //check each cell 
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j]; // current state (0 = dead, 1 = alive)
      let neighbors = countLivingNeighbors(grid, i, j); //check alive neighbors
      
     //rules here 
      if (state == 0 && neighbors == 3) {
        nextGrid[i][j] = 1; //born
      } else if (state == 1 && (neighbors < 2 || neighbors > 3)) {
        nextGrid[i][j] = 0; //dies
      } else {
        nextGrid[i][j] = state; //stays the same
      }
    }
  }
  
  
  if (motionDetected) {
    if (frameCount % 10 === 0) { // every 10 frames
      let i = floor(random(cols));
      let j = floor(random(rows));
      nextGrid[i][j] = 1; //make random cell alive 
    }
  }
  
  grid = nextGrid; //new grid 
}


function countLivingNeighbors(grid, x, y) {
  let sum = 0; //counts total number of living neighbors 
  
  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      // This part was way too complicated - I looked it up online and the youtube tutorial helped understand 
      let col = (x + i + cols) % cols; //makes the edges to not end there and come back from different edges 
      let row = (y + j + rows) % rows;
     
      if (grid[col][row] == 1) { //count live neighbors
        sum = sum + 1;
      }
    }
  }
  

  if (grid[x][y] == 1) { //cell cant be counted as neighbor 
    sum = sum - 1;
  }
  
  return sum;
}

//IN CASE HAND DETECTION FAILS 
function mousePressed() {
  console.log("Mouse clicked at: " + mouseX + ", " + mouseY);
  makeMotionEffect(mouseX, mouseY);
  return false;
}

//makes the canvas fit to the new window size 
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
//calculate grid size based on the window 
  cols = Math.floor(width / resolution);
  rows = Math.floor(height / resolution);
  

  if (cols <= 0) cols = 1;
  if (rows <= 0) rows = 1;
  
  console.log("Window resized! New grid: " + cols + " x " + rows);
  
 //this is to adjust the grid to the new window size 
  let newGrid = make2DArray(cols, rows);
  
  //LLM suggested 
  for (let i = 0; i < min(grid.length, cols); i++) {
    for (let j = 0; j < min(grid[0].length, rows); j++) {
      newGrid[i][j] = grid[i][j];
    }
  }
  
  grid = newGrid;
}

//reset the grid with any key press on keyboard 
function keyPressed() {
  fillGridWithRandomStuff();
  console.log("RESET GRID!!!");
}