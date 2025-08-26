import { useState, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import EvalBar from './components/EvaluationBar';
import ClipLoader from "react-spinners/ClipLoader";

let currentAnalysis = null;
let nextAnalysis = null;
let currSfStr = "";
let isStockfishBusy = false;
let stopAlreadyCalled = false;
const bestmoveRegex = /bestmove/;
const multipv1Regex = /info depth 20 seldepth \d+ multipv 1 score ((?:cp|mate) -?\d+) nodes \d+ nps \d+ hashfull \d+ tbhits \d+ time \d+ pv ([a-h][1-8][a-h][1-8][qrnb]?)/;
const multipv2Regex = /info depth 20 seldepth \d+ multipv 2 score ((?:cp|mate) -?\d+) nodes \d+ nps \d+ hashfull \d+ tbhits \d+ time \d+ pv ([a-h][1-8][a-h][1-8][qrnb]?)/;
const multipv3Regex = /info depth 20 seldepth \d+ multipv 3 score ((?:cp|mate) -?\d+) nodes \d+ nps \d+ hashfull \d+ tbhits \d+ time \d+ pv ([a-h][1-8][a-h][1-8][qrnb]?)/;

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
  // any other CSS properties you want to override
};

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


function getBestStockfishMoves(gameRef, fen, depth = 15, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2) {
  console.log(fen);

  // If Stockfish is busy, cancel current analysis by sending stop command ONLY ONCE
  if (isStockfishBusy && !stopAlreadyCalled) {
    stopAlreadyCalled = true;
    window.stockfish.sendCommand("stop");
  }
  
  // create deferred promise for new move
  return new Promise((resolve) => {
    
    const analysisRequest = {
      fen,
      resolve,
      turn: gameRef.current.turn(),
      setCurrentEvaluation,
      stockfishMove0,
      stockfishMove1,
      stockfishMove2
    };

    // if stockfish is busy, simply resolve old promise if one exists and create one for this move, as stop already sent (either now or by previous promise)
    if (isStockfishBusy) {
      // if next analysis exists, needs replaced so resolve as false
      if (nextAnalysis != null) {
        const { resolve: prevResolve } = nextAnalysis
        prevResolve(false);
      }
      nextAnalysis = analysisRequest;

      // if stockfish isn't busy, start analysis of played move
    } else {
      currentAnalysis = analysisRequest;
      isStockfishBusy = true;
      stopAlreadyCalled = false;

      // Start Stockfish analysis
      window.stockfish.sendCommand("uci");
      window.stockfish.sendCommand("isready");
      window.stockfish.sendCommand("setoption name MultiPV value 3");
      window.stockfish.sendCommand(`position fen ${fen}`);
      window.stockfish.sendCommand(`go depth ${depth}`);
    }

  });
}

function openLichessAnalysisBoard(fen) {
  const url = `https://lichess.org/analysis/${fen}`;

  window.open(url, '_blank');
}


function App() {
const [game, setGame] = useState(new Chess());
const [minELO, setMinELO] = useState("1800");
const [arrows, setArrows] = useState([
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
const loadingAPIResponses = useRef(false);

const stockfishMove0 = useRef({});
const stockfishMove1 = useRef({});
const stockfishMove2 = useRef({});
const masterMove0 = useRef("");
const masterMove1 = useRef("");
const masterMove2 = useRef("");
const normieMove0 = useRef("");
const normieMove1 = useRef("");
const normieMove2 = useRef("");
const disableAnalysisBoardButton = useRef(true);
const displayPlayMoveText = useRef(false);
const displayEvalBarRef = useRef(true);
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

    currSfStr += data
    console.log("Best move found: " + bestmoveRegex.test(currSfStr))

    if (bestmoveRegex.test(currSfStr)) {
      
      // console.log("Current string: " + currSfStr)
      // console.log("Done printing curr str shit")
      console.log("multipv 3 line found: " + multipv3Regex.test(currSfStr))
      // if data includes depth 20 multipv 3, found 3 best lines, so handle accordingly, otherwise, stop was called early
      if (multipv3Regex.test(currSfStr)) {
        console.log("Found best move at depth 20!!!!!!!!!!")
        
        // Get the promise resolvers for this position in order to check who's turn it  was for position in promise
        const { fen, resolve, turn, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2 } = currentAnalysis;
        console.log("FEN: " + fen)
        
        let mult = turn == 'w' ? 1 : -1;

        let match = currSfStr.match(multipv1Regex)
        let hasMate = false;
        let mateCount = null;
        console.log("Match 1 cp or mate: " + match[1]);

        let centipawn = "";
        if (match[1].includes("mate")) {
            centipawn = turn == 'w' ? "1000" : "-1000"
            // grab entire number at end of capture group
            mateCount = parseInt(match[1].substring(5));
            hasMate = true;
        } else {
            const cp = match[1].substring(3);
            centipawn = (turn == 'w' ? cp : (parseInt(cp) * -1).toString());
            hasMate = false;
        }
        
        // update evaluation centipawns for eval bar
        setCurrentEvaluation(hasMate ? (mult === -1 ? ("M" + ((mateCount * mult).toString())) : ("M" + mateCount.toString())) : centipawn);
        
        let moveUCI = match[2];
        stockfishMove0.current["CP"] = hasMate ? (mult === -1 ? ("M" + ((mateCount * mult).toString())) : ("M" + mateCount.toString())) : centipawn;  
        stockfishMove0.current["UCI"] = moveUCI.substring(0, 4);  
        

        match = currSfStr.match(multipv2Regex)
        if (match[1].includes("mate")) {
            centipawn = turn == 'w' ? "1000" : "-1000"
            // grab entire number at end of capture group
            mateCount = parseInt(match[1].substring(5));
            hasMate = true;
        } else {
            const cp = match[1].substring(3);
            centipawn = (turn == 'w' ? cp : (parseInt(cp) * -1).toString());
            hasMate = false;
        }
        
        moveUCI = match[2];
        stockfishMove1.current["CP"] = hasMate ? (mult === -1 ? ("M" + ((mateCount * mult).toString())) : ("M" + mateCount.toString())) : centipawn;  
        stockfishMove1.current["UCI"] = moveUCI;  

        match = currSfStr.match(multipv3Regex)
        if (match[1].includes("mate")) {
            centipawn = turn == 'w' ? "1000" : "-1000"
            // grab entire number at end of capture group
            mateCount = parseInt(match[1].substring(5));
            hasMate = true;
        } else {
            const cp = match[1].substring(3);
            centipawn = (turn == 'w' ? cp : (parseInt(cp) * -1).toString());
            hasMate = false;
        }

        moveUCI = match[2];
        stockfishMove2.current["CP"] = hasMate ? (mult === -1 ? ("M" + ((mateCount * mult).toString())) : ("M" + mateCount.toString())) : centipawn;  
        stockfishMove2.current["UCI"] = moveUCI;  
            

            
        // if there's a new move to analyze and we happened to finish, start it, otherwise, set stockfish to not busy
        if (nextAnalysis != null) {
          console.log("NEW MOVE BUT FINISHING CURRENT ONE!!!!!")
          // don't display arrows as there's another move already played
          resolve(false);
          
          // set stockfish to busy still (redundant?) and reset stop already called to false
          isStockfishBusy = true;
          stopAlreadyCalled = false;
          
          // reset current analysis and clear next analysis
          currentAnalysis = nextAnalysis;
          let { fen: newFen } = nextAnalysis;
          nextAnalysis = null;

          // Start Stockfish analysis for already played move
          window.stockfish.sendCommand("uci");
          window.stockfish.sendCommand("isready");
          window.stockfish.sendCommand("setoption name MultiPV value 3");
          window.stockfish.sendCommand(`position fen ${newFen}`);
          window.stockfish.sendCommand(`go depth 20`);
        } else {
          isStockfishBusy = false;
          console.log("NO SECOND MOVE ALREADY!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
          resolve(true);
        }

        // if stop called early, stop current analysis, resolve to false, and start analysis for newly played move
      } else {
        console.log("STOP CALLED EARLY!!!!!!!!")

        const { resolve } = currentAnalysis;

        resolve(false);

        // new move was play, so start new analysis
        if (nextAnalysis != null) {
          const { fen: newFen } = nextAnalysis;
          isStockfishBusy = true;
          stopAlreadyCalled = false;
          currentAnalysis = nextAnalysis;
          nextAnalysis = null;

          // Start Stockfish analysis
          window.stockfish.sendCommand("uci");
          window.stockfish.sendCommand("isready");
          window.stockfish.sendCommand("setoption name MultiPV value 3");
          window.stockfish.sendCommand(`position fen ${newFen}`);
          window.stockfish.sendCommand(`go depth 20`);
        } else {
          isStockfishBusy = false;
          console.log("ERROR SHOULD NEVER HAPPEN!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        }
      }
      currSfStr = ""
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
    disableAnalysisBoardButton.current = true;
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
    
    if (disableAnalysisBoardButton.current) {
      disableAnalysisBoardButton.current = false;
    }

    // clear current arrows
      if(displayEvalBarRef.current == false) {
        console.log("REMOVING OLD ARROWS!!!!!")
        setOldArrows([
          ['', '', ''],
          ['', '', ''],
          ['', '', '']]
        );
      } else {
        console.log("REMOVING NEW ARROWS!!!!!")
        setArrows([
          ['', '', ''],
          ['', '', ''],
          ['', '', '']]
        );
      }



    // TODO: TEST WITH THIS AS WELL AS try to find fix for super quick play and listener b/w issues due to wrong listener being alive
      // window.stockfish.sendCommand("stop");
    const move = gameRef.current.move({
      from: str.substring(0, 2),
      to: str.substring(2, 4),
    });

    setGame(new Chess(gameRef.current.fen()));

    loadingAPIResponses.current = true;

    // grab best stockfish moves, master moves, and normie moves
    console.log("about to start all promises")
    const [masterMoves, normieMoves, stockfishResult] = await Promise.all([
      getMasterMoves(gameRef.current.fen()),
      getNormieMoves(gameRef.current.fen(), 2000),
      getBestStockfishMoves(gameRef, gameRef.current.fen(), 20, setCurrentEvaluation, stockfishMove0, stockfishMove1, stockfishMove2)
    ]);

    console.log(stockfishResult)
    if (stockfishResult) {

    loadingAPIResponses.current = false;
    
      // update master best moves text
      console.log("Master Moves")
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
        
        {loadingAPIResponses.current && 
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
        
        <h3 className="text-3xl font-bold my-5 text-white">Stockfish Best Moves</h3> 
        <p className="text-3xl text-green-300 mb-3">Stockfish Move 0: {(displayEvalBarRef.current && stockfishMove0.current["UCI"]) ? `${stockfishMove0.current["UCI"]}, ${stockfishMove0.current["CP"]}` : ""}</p>
        <p className="text-3xl text-yellow-300 mb-3">Stockfish Move 1: {(displayEvalBarRef.current && stockfishMove1.current["UCI"]) ? `${stockfishMove1.current["UCI"]}, ${stockfishMove1.current["CP"]}` : ""}</p>
        <p className="text-3xl text-orange-300 mb-5">Stockfish Move 2: {(displayEvalBarRef.current && stockfishMove2.current["UCI"]) ? `${stockfishMove2.current["UCI"]}, ${stockfishMove2.current["CP"]}` : ""}</p>
        
        <h3 className="text-3xl font-bold my-5 text-white">Popular Master Moves</h3> 
        <p className="text-3xl text-white mb-2">Master Move 1: {displayEvalBarRef.current ? `${masterMove0.current}` : ""}</p>
        <p className="text-3xl text-white mb-2">Master Move 2: {displayEvalBarRef.current ? `${masterMove1.current}` : ""}</p>
        <p className="text-3xl text-white mb-5">Master Move 3: {displayEvalBarRef.current ? `${masterMove2.current}` : ""}</p>
        
        <h3 className="text-3xl font-bold my-5 text-white">Popular Moves over {minELO}</h3> 
        <p className="text-3xl text-white mb-2">Move 0: {displayEvalBarRef.current ? `${normieMove0.current}` : ""}</p>
        <p className="text-3xl text-white mb-2">Move 1: {displayEvalBarRef.current ? `${normieMove1.current}` : ""}</p>
        <p className="text-3xl text-white mb-5">Move 2: {displayEvalBarRef.current ? `${normieMove2.current}` : ""}</p>
        
      <button 
        onClick={() => openLichessAnalysisBoard(gameRef.current.fen())} 
        disabled={disableAnalysisBoardButton.current}
        className={`mt-6 font-bold py-3 px-6 rounded text-xl ${
          disableAnalysisBoardButton.current 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-white hover:bg-gray-200 text-blue-700 hover:cursor-pointer'
        }`}
      >
        Go To Lichess Analysis Board
      </button>
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