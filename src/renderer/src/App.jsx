import { useState, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Random } from 'random-js';
import EvalBar from './components/EvaluationBar';

import stockfish from "stockfish.js";
import ClipLoader from "react-spinners/ClipLoader";
const random = new Random()
let prevFEN = null;

// Create a global map to store promises by position
const positionPromises = new Map();

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
  // any other CSS properties you want to override
};

// Now we have access to the safe API we exposed

  function updateMinELO(newELO, setMinELO) {
    if (newELO <= 2500 && newELO >= 0) {
    setMinELO(newELO)
    }
  }


  async function getMasterMoves(FEN) {
    console.log("about to grab master moves")
    const response = await fetch(`/lichess/masters?fen=${FEN}`).catch(error => {console.log("INVALID DATA2")})
    return await response.json()
  }

  async function getBestMoves(FEN, stockfishMove0, stockfishMove1, stockfishMove2, setCurrentEvaluation) {
    // GRAB ENGINE BEST MOVES
    return await getBestMove(FEN, 15, setCurrentEvaluation);
  }

  async function getNormieMoves(FEN, minELO) {
    console.log("about to grab normie moves")
    // GRAB NORMIE MOVES
    const response = await fetch(`/lichess/lichess?fen=${FEN}`).catch(error => {console.log("INVALID DATA2")});
    return await response.json();
  }
let removeListeners = null;
function getBestStockfishMoves(gameRef, fen, depth = 15, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2) {
  console.log(fen);
  
  return new Promise(async (resolve) => {
    
    // Store the promise resolvers
    positionPromises.set(fen, {
      resolve,
      turn: gameRef.current.turn(),
      setCurrentEvaluation,
      stockfishMove0,
      stockfishMove1,
      stockfishMove2
    });
    
    // Initialize the engine and start analysis
    window.stockfish.sendCommand("uci");
    window.stockfish.sendCommand("isready");
    window.stockfish.sendCommand("setoption name MultiPV value 3");
    window.stockfish.sendCommand(`position fen ${fen}`);

    prevFEN = gameRef.current.fen();
    window.stockfish.sendCommand(`go depth ${depth}`);
  });
}

function openLichessAnalysisBoard(fen) {
  const url = `https://lichess.org/analysis/${fen}`;

  window.open(url, '_blank');
}


function App() {
const [game, setGame] = useState(new Chess());
const [minELO, setMinELO] = useState("1800");
const [loadingAPIResponses, setLoadingAPIResponses] = useState(false);
const [arrows, setArrows] = useState([
  // ['e2', 'e4', 'green'],
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
]);
const [oldArrows, setOldArrows] = useState([
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
]);

const [currentEvaluation, setCurrentEvaluation] = useState(0);

const stockfishMove0 = useRef({});
const stockfishMove1 = useRef({});
const stockfishMove2 = useRef({});
const masterMove0 = useRef("");
const masterMove1 = useRef("");
const masterMove2 = useRef("");
const normieMove0 = useRef("");
const normieMove1 = useRef("");
const normieMove2 = useRef("");
const yourMove = useRef("");
const disableAnalysisBoardButton = useRef(true);
const analysisBoardFEN = useRef("");
const chessboardOrientation = useRef('white');
const displayPlayMoveText = useRef(false);
const displayMovesText = useRef(true)
const displayEvalBarRef = useRef(true);
const [displayEvalBar, setDisplayEvalBar] = useState(true);
const [displayArrows, setDisplayArrows] = useState(true);
const gameRef = useRef(game);


// Set up the listener once, outside the function
let stockfishListener = null;

function setupStockfishListener() {
  if (stockfishListener) return; // Only set up once
  
  // when output from stockfish received, update accordingly
  stockfishListener = window.stockfish.onOutput((data) => {
    // TODO: FIX FOR MATE FOR BOTH EVAL AND FINDING IT IN STOCKFISH STRING
    console.log(data);
    
    // if data starts with it's at depth 20 and includes the eval, update stockfish moves and centipawn
    if (data.startsWith(`info depth 20`) && data.includes("multipv")) {
      const fen = prevFEN;
      
      // TODO: SHOULD PROBABLY REMOVE AS DOESN"T DO VALID JOB OF GETTING ACCURATE EVAL FOR TRUE POSITION FOR EVAL
      // Get the promise resolvers for this position in order to check who's turn it  was for position in promise
      const promiseData = positionPromises.get(fen);
      console.log("Promise data: ", promiseData)
      if (!promiseData) return;
      
      const { resolve, turn, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2 } = promiseData;
      
      // Parse the data
      const wordsArr = data.split(" ");
      let cpIndex = wordsArr.indexOf("cp");
      let cp = wordsArr[cpIndex + 1];
      let mateIndex = wordsArr.indexOf("mate");
      let mateNum = wordsArr[mateIndex + 1];
      let moveNumIndex = wordsArr.indexOf("multipv");
      let moveNum = wordsArr[moveNumIndex + 1];
      let pvIndex = wordsArr.indexOf("pv");
      let moveUCI = wordsArr[pvIndex + 1];
      
      // Process the top 3 moves
      let iter = 0;
      let mult = turn == 'w' ? 1 : -1;
      let hasMate = false;
      
      // loop through till all 3 moves handled
      while (moveNumIndex !== -1) {
        // TODO: REFACTOR SWITCH STATEMENT TO HAVE CENTIPAWN AND HAS MATE OUTSIDE!!!
        const centipawn = mateIndex !== -1 ? (turn == 'w' ? "1000" : "-1000") : (turn == 'w' ? cp : (parseInt(cp) * -1).toString());

        // set hasMate to true so cp not updated but mate index is at end of this iteration
        if (mateIndex !== -1) {
          hasMate = true;
        }
        switch (iter) {
          case 0:
            // update evaluation centipawns for eval bar
            setCurrentEvaluation(hasMate ? (mult === -1 ? ("-" + "M" + mateNum.toString()) : ("M" + mateNum.toString())) : centipawn);
            
            // TODO: FIX BUG WITH CP/UCI of move!!!!!!!! includes info, or some shit, as well as fix eval to show mate not cp
            stockfishMove0.current[`CP`] = hasMate ? "M" + mateNum.toString() : centipawn;  
            stockfishMove0.current[`UCI`] = moveUCI.substring(0, 4);  
            break;
          case 1:
            stockfishMove1.current[`CP`] = hasMate ? "M" + mateNum.toString() : centipawn; 
            stockfishMove1.current[`UCI`] = moveUCI;  
            break;
          case 2:
            stockfishMove2.current[`CP`] = hasMate ? "M" + mateNum.toString() : centipawn;
            stockfishMove2.current[`UCI`] = moveUCI;  
            
            // Clean up and resolve
            positionPromises.delete(fen);
            resolve(true);
            break;
        }
        
        iter++;
        moveNumIndex = wordsArr.indexOf("multipv", moveNumIndex + 1)
        if (moveNumIndex === -1) break;
        
        moveNum = wordsArr[moveNumIndex + 1]

        // if this move was mate, look for new mate, as if cp exists, we already have it
        if (!hasMate) {
          cpIndex = wordsArr.indexOf("cp", cpIndex + 1)
          cp = wordsArr[cpIndex + 1];
        } else {
          hasMate = false;
          mateIndex = wordsArr.indexOf("mate", mateIndex + 1)
          mateNum = wordsArr[mateIndex + 1];
        }
        pvIndex = wordsArr.indexOf("pv", pvIndex + 1)
        moveUCI = wordsArr[pvIndex + 1]
      }
      for (otherFen in positionPromises.keys()) {
        promiseData = positionPromises.get(otherFen)
        const { resolve, turn, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2 } = promiseData;
        resolve(false);
        positionPromises.delete(otherFen)
      }
      
    } 

  });
}

useEffect(() => {
  gameRef.current = game;
}, [game]);

function toggleEvalBar() {
  // if eval bar is off, make arrows disappear, otherwise, if turning on, put back on most up to date arrows
  displayEvalBarRef.current = !(displayEvalBarRef.current);

  if(displayEvalBarRef.current == false) {
    console.log("SETTING OLD ARROWS!!!!!")
    setOldArrows(
      arrows
    );
    setArrows([
      ['', '', ''],
      ['', '', ''],
      ['', '', '']]
    );
  } else {
    console.log("SETTING NEW ARROWS!!!!!")
    setArrows(oldArrows); 
    setOldArrows([
      ['', '', ''],
      ['', '', ''],
      ['', '', '']]
    );
  }

  setDisplayEvalBar(displayEvalBarRef.current);
  console.log(arrows)
}

  
async function handleWebsocketMessage(message) {
  let str = '';
  for (let i = 0; i < message.length; i++) {
    str += String.fromCharCode(message[i]);
  }
  console.log('Received from WebSocket:', str)
  // if received string is reset game, check if it's a game reset or a move being played
  if (str == "reset game") {
    console.log("resetting game!!!!!!")
    setGame(new Chess());

    // reset current arrows and old arrows
    setArrows(
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    );
    setOldArrows(
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    );
    console.log(gameRef.current.fen())
    setCurrentEvaluation(0);
    return;
  } else {
    // stop any previous search
    window.stockfish.sendCommand("stop");

    // TODO: TEST WITH THIS AS WELL AS try to find fix for super quick play and listener b/w issues due to wrong listener being alive
      // window.stockfish.sendCommand("stop");
    const move = gameRef.current.move({
      from: str.substring(0, 2),
      to: str.substring(2, 4),
    });

    setGame(new Chess(gameRef.current.fen()));

    // grab best stockfish moves, master moves, and normie moves
    console.log("about to start all promises")
    const [masterMoves, normieMoves, stockfishResult] = await Promise.all([
      getMasterMoves(gameRef.current.fen()),
      getNormieMoves(gameRef.current.fen(), 2000),
      getBestStockfishMoves(gameRef, gameRef.current.fen(), 20, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2)
    ]);
    // getBestMove(gameRef.current.fen(), 20, setCurrentEvaluation); 
    console.log(stockfishResult)
    if (stockfishResult) {
    
      // update master best moves text
      console.log(masterMoves.moves[0])
      console.log(masterMoves.moves[1])
      console.log(masterMoves.moves[2])
      masterMove0.current = masterMoves.moves[0] != undefined ? masterMoves.moves[0].uci : "No move found";
      masterMove1.current = masterMoves.moves[1] != undefined ? masterMoves.moves[1].uci : "No move found";
      masterMove2.current = masterMoves.moves[2] != undefined ? masterMoves.moves[2].uci : "No move found";

      // update normie best moves
      console.log(normieMoves.moves[0])
      console.log(normieMoves.moves[1])
      console.log(normieMoves.moves[2])
      normieMove0.current = normieMoves.moves[0] != undefined ? normieMoves.moves[0].uci : "No move found";
      normieMove1.current = normieMoves.moves[1] != undefined ? normieMoves.moves[1].uci : "No move found";
      normieMove2.current = normieMoves.moves[2] != undefined ? normieMoves.moves[2].uci : "No move found";

      // TODO: TEST TO SEE IF UPDATES OLD ARROWS IN BACKGROUND WHEN OFF!!!!
      // update arrows if enabled and update old arrows if disabled
      console.log("Display Eval Bar: " + displayEvalBarRef.current)
      if (displayEvalBarRef.current) {
        setArrows([[stockfishMove0.current["UCI"].substring(0, 2), stockfishMove0.current["UCI"].substring(2, 4), 'green'],
                  [stockfishMove1.current["UCI"].substring(0, 2), stockfishMove1.current["UCI"].substring(2, 4), 'yellow'],
                  [stockfishMove2.current["UCI"].substring(0, 2), stockfishMove2.current["UCI"].substring(2, 4), 'orange']]
        );
      } else {
        setOldArrows([[stockfishMove0.current["UCI"].substring(0, 2), stockfishMove0.current["UCI"].substring(2, 4), 'green'],
                  [stockfishMove1.current["UCI"].substring(0, 2), stockfishMove1.current["UCI"].substring(2, 4), 'yellow'],
                  [stockfishMove2.current["UCI"].substring(0, 2), stockfishMove2.current["UCI"].substring(2, 4), 'orange']]
        );
      }

    }
  }

}
  
useEffect(() => {
  // Register the WebSocket listener once
  window.electronAPI.receive('ws-message', handleWebsocketMessage);

  // setup stockfish listener
  setupStockfishListener();

  // Clean up on unmount
  return () => {
    // If there's a way to remove the listener, do it here
    // window.electronAPI.removeListener('ws-message', handleWebsocketMessage);
  };
}, []);

return (
  <div className="bg-blue-500 flex flex-row gap-6 mx-auto h-screen">
    {/* Add the evaluation bar - fixed width */}
    <div className="" style={{ width: '50px', padding: '10px', flexShrink: 0 }}>
      {displayEvalBarRef.current && <EvalBar 
        evaluation={currentEvaluation} 
        isWhiteToMove={game.turn() === 'w'} 
        height="90vh" 
        width={50} 
      />}
    </div>
    
    {/* Main content container with fixed widths */}
    <div className="flex flex-col md:flex-row gap-4 flex-1">
      {/* Chess board - fixed width */}
      <div className="w-[90vh]">
        <div className="h-[90vh]" style={{maxHeight: '1000px' }}>
        <div>
          <Chessboard 
            position={game.fen()} 
            arePiecesDraggable={false} 
            areArrowsAllowed={displayArrows} 
            customArrows={arrows} 
            animationDuration={300}
          />
        </div>
        </div>
        {displayPlayMoveText.current && 
          <div className="text-center font-bold text-lg my-2 bg-blue-100 dark:bg-blue-900 rounded text-black dark:text-white">
            {"Please play a move and compare with the best moves!"} 
          </div>
        }
      </div>
      
      {/* Move Analysis - fixed width with larger text */}
      <div className="w-full md:w-auto md:flex-1 bg-blue-500 p-6 rounded flex flex-col justify-start" style={{ maxWidth: '600px', flexShrink: 0, height: '90vh' }}>
        <h2 className="text-5xl font-bold mb-6 text-white">Move Analysis</h2> 
        <h3 className="text-4xl font-bold mb-5 text-white">Your Move: {yourMove.current}</h3> 
        
        {loadingAPIResponses && 
          <div className="loader flex items-center mb-4">
            <span className="pr-5 font-bold text-3xl text-white">Loading Best Moves</span>
            <ClipLoader
              color={"#ffffff"}
              loading={loadingAPIResponses.current}
              override={override}
              size={28}
            />
          </div>
        }
        
        {loadingAPIResponses && 
          <div className="pb-5 text-3xl text-white">Feel Free to Play Your Move in the Meantime</div>
        }
        
        <h3 className="text-3xl font-bold my-5 text-white">Stockfish Best Moves</h3> 
        <p className="text-3xl text-green-300 mb-3">Stockfish Move 0: {displayMovesText.current ? `${stockfishMove0.current["UCI"]}, ${stockfishMove0.current["CP"]}` : ","}</p>
        <p className="text-3xl text-yellow-300 mb-3">Stockfish Move 1: {displayMovesText.current ? `${stockfishMove1.current["UCI"]}, ${stockfishMove1.current["CP"]}` : ","}</p>
        <p className="text-3xl text-orange-300 mb-5">Stockfish Move 2: {displayMovesText.current ? `${stockfishMove2.current["UCI"]}, ${stockfishMove2.current["CP"]}` : ","}</p>
        
        <h3 className="text-3xl font-bold my-5 text-white">Popular Master Moves</h3> 
        <p className="text-3xl text-white mb-2">Master Move 1: {displayMovesText.current ? `${masterMove0.current}` : ""}</p>
        <p className="text-3xl text-white mb-2">Master Move 2: {displayMovesText.current ? `${masterMove1.current}` : ""}</p>
        <p className="text-3xl text-white mb-5">Master Move 3: {displayMovesText.current ? `${masterMove2.current}` : ""}</p>
        
        <h3 className="text-3xl font-bold my-5 text-white">Popular Moves over {minELO}</h3> 
        <p className="text-3xl text-white mb-2">Move 0: {displayMovesText.current ? `${normieMove0.current}` : ""}</p>
        <p className="text-3xl text-white mb-2">Move 1: {displayMovesText.current ? `${normieMove1.current}` : ""}</p>
        <p className="text-3xl text-white mb-5">Move 2: {displayMovesText.current ? `${normieMove2.current}` : ""}</p>
        
        {!disableAnalysisBoardButton.current && 
          <button 
            onClick={() => openLichessAnalysisBoard(analysisBoardFEN.current)} 
            className="mt-6 bg-white hover:bg-gray-200 text-blue-700 font-bold py-3 px-6 rounded text-xl"
          >
            Go To Lichess Analysis Board
          </button>
        }
      </div>
    </div>
    <div className="flex-row">
      <input type="checkbox" id="showEvalBarCheckbox" onChange={toggleEvalBar} />
    </div>
    <label htmlFor="showEvalBarCheckbox" className="ml-2 text-white">
      Toggle Evaluation Bar
    </label>
  </div>
)
}

export default App