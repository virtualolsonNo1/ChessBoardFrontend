import { useState, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Random } from 'random-js';
import EvalBar from './components/EvaluationBar';

import stockfish from "stockfish.js";
import ClipLoader from "react-spinners/ClipLoader";
const random = new Random()

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
  // any other CSS properties you want to override
};

const openings_fen = { 
     random: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
     italian: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
     sicilian: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
     sicilian_yugoslov: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 0 6',
     french: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
     caro: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3'
};


  function updateMinELO(newELO, setMinELO) {
    if (newELO <= 2500 && newELO >= 0) {
    setMinELO(newELO)
    }
  }


  async function getMasterMoves(FEN) {
    const response = await fetch(`/lichess/masters?fen=${FEN}`).catch(error => {console.log("INVALID DATA2")})
    return await response.json()
  }

  async function getBestMoves(FEN, stockfishMove0, stockfishMove1, stockfishMove2, setCurrentEvaluation) {
    // GRAB ENGINE BEST MOVES
    return await getBestMove(FEN, 15, setCurrentEvaluation);
  }

  async function getNormieMoves(FEN, minELO) {
    
    // GRAB NORMIE MOVES
    const response = await fetch(`/lichess/lichess?fen=${FEN}&ratings=${minELO}`).catch(error => {console.log("INVALID DATA2")});
    return await response.json();
  }

  async function loadRandomPosition(chessboardOrientation, setGame, opening, minELO, allowDrop, stockfishMove0, stockfishMove1, stockfishMove2, masterMove0, masterMove1, masterMove2, normieMove0, normieMove1, normieMove2, yourMove, movesFoundLate, setMovesFoundLate, setRandomPositionDisabled, loadingAPIResponses, setLoadingAPIResponses, disableAnalysisBoardButton, analysisBoardFEN, displayPlayMoveText, setArrows, displayMovesText, setCurrentEvaluation) {
    // re-set move text
    stockfishMove0.current["UCI"] = "";
    stockfishMove0.current["CP"] = "";
    stockfishMove1.current["UCI"] = "";
    stockfishMove1.current["CP"] = "";
    stockfishMove2.current["UCI"] = "";
    stockfishMove2.current["CP"] = "";
    masterMove0.current = "";
    masterMove1.current = "";
    masterMove2.current = "";
    normieMove0.current = "";
    normieMove1.current = "";
    normieMove2.current = "";
    yourMove.current = ""
    disableAnalysisBoardButton.current = true;
    displayPlayMoveText.current = false;
    displayMovesText.current = false;

    // re-render current opening before displaying new position

    setArrows([['', '', ''],
              ['', '', ''],
              ['', '', '']]);
    setRandomPositionDisabled(true);
    setGame(new Chess(openings_fen[opening.current]))

    // get random numbers of moves to go ahead
    let numMoves = random.integer(0, 3)
    numMoves = (numMoves * 2) + 1

    // if opening is random want truly random move, not just random position for that side
    if (opening.current == "random") {
      numMoves = random.integer(1, 10);
    }
    console.log("Num random moves: " + numMoves)
    
    let position_fen = openings_fen[opening.current]
    let board = new Chess(position_fen) 
    
    // loop through numMoves times, grabbing the most popular moves, choosing a random one, and playing it
    for (let i = 0; i < numMoves; i++) {
      // const response = await fetch(`/lichess/masters?fen=${openings_fen[opening]}`).catch(error => {console.log("INVALID DATA2")})
      const response = await fetch(`/lichess/lichess?fen=${position_fen}&ratings=${minELO}`).catch(error => {console.log("INVALID DATA2")})
      const data =  await response.json()
      let moveNum = random.integer(0, data.moves.length - 1)

      // TODO: REMOVE LATER, TEMP FIX TO WORSE PROBLEM!!!!!!!!!!!!!!!!
      if (moveNum > 3) {
        moveNum = random.integer(0, 3);
      }
      
      console.log("Random move to choose: " + moveNum)
      
      console.log(data)
      console.log(data.moves[moveNum].uci)

      let fromSquare = data.moves[moveNum].uci.substring(0, 2);
      let toSquare = data.moves[moveNum].uci.substring(2, 4);
      
      // check for castling, as notation is different between javascript chess library to/from square and lichess uci response
      if (data.moves[moveNum].san == 'O-O') {
        if (fromSquare == "e1") {
          console.log("WHITE SHORT CASTLING!!!!!!!!!")
          toSquare = "g1";
        } else if (fromSquare == "e8") {
          console.log("BLACK SHORT CASTLING!!!!!!!!!")
          toSquare = "g8";
        }

      } else if (data.moves[moveNum].san == 'O-O-O') {
        if (fromSquare == "e1") {
          console.log("WHITE LONG CASTLING!!!!!!!!!")
          toSquare = "c1";
        } else if (fromSquare == "e8") {
          console.log("BLACK LONG CASTLING!!!!!!!!!")
          toSquare = "c8";
        }
        
      }         

      // play move on the board
        board.move({
          from: fromSquare,
          to: toSquare,
        });

      position_fen = board.fen()
      // TODO: DO WE WANT TO TRY TO ANIMATE OUT MOVES? WASN"T SMOOTH PREVIOUSLY AS TWAS A LOT OF RENDERING!!!
      // setGame(new Chess(position_fen))

    }

    chessboardOrientation.current = board.turn() == 'w' ? 'white' : 'black';
    analysisBoardFEN.current = position_fen;
    disableAnalysisBoardButton.current = false;
    displayPlayMoveText.current = true;
    
    // set updated game
    setGame(new Chess(position_fen))

    // allow player to click button again
    setRandomPositionDisabled(false);
    
    // allow pieces to be moved post-re-render with new position
    allowDrop.current = true;

    setLoadingAPIResponses(true); 
    
    // after re-render, grab info for best moves on the board
    // grab all best moves, doing so in parallel using Promise.all so io time on one starts others
    const [masterMoves, normieMoves, stockfishMoves] = await Promise.all([
      getMasterMoves(position_fen),
      getNormieMoves(position_fen, minELO),
      getBestMoves(position_fen, stockfishMove0, stockfishMove1, stockfishMove2, setCurrentEvaluation)
    ]);
    

    setLoadingAPIResponses(false); 

    // set timeout so that re-render occurrs before these are updated
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

    console.log("BEST MOVE: ", stockfishMoves);
    stockfishMove0.current["UCI"] = stockfishMoves.move1UCI;
    stockfishMove0.current["CP"] = stockfishMoves.move1CP;
    stockfishMove1.current["UCI"] = stockfishMoves.move2UCI;
    stockfishMove1.current["CP"] = stockfishMoves.move2CP;
    stockfishMove2.current["UCI"] = stockfishMoves.move3UCI;
    stockfishMove2.current["CP"] = stockfishMoves.move3CP;
    
    // re-render if person already played move so best moves still show up
    if (allowDrop.current == false) {
      setArrows([[stockfishMove0.current["UCI"].substring(0, 2), stockfishMove0.current["UCI"].substring(2, 4), 'green'],
                [stockfishMove1.current["UCI"].substring(0, 2), stockfishMove1.current["UCI"].substring(2, 4), 'yellow'],
                [stockfishMove2.current["UCI"].substring(0, 2), stockfishMove2.current["UCI"].substring(2, 4), 'orange']]
    );
      // setMovesFoundLate(movesFoundLate + 1);
      console.log("movesFoundLate: ", movesFoundLate);
    }
    console.log(allowDrop.current);
  }

function getBestMove(fen, depth = 15, setCurrentEvaluation) {
  // return promise once resolve from stockfish worker in new process
  return new Promise((resolve) => {
    const stockfish = new Worker(new URL("stockfish.js", import.meta.url), {
    type: "module",
    });
    
    // post message to use uci format, check if stockfish is ready, and grab top 3 moves/lines
    stockfish.postMessage("uci");
    stockfish.postMessage("isready");
    stockfish.postMessage("setoption name MultiPV value 3");
    
    // variable to store moves stockfish returns
    let stockfishMoves = {};
    
    // on message, check if it's at max depth, and if so, grab info on these lines, returning resolve with moves info after 3rd one completed
    stockfish.onmessage = (event) => {
      console.log(event.data);

      // once final depth of analysis complete for each line, add first move and CP value to data to be returned
      if (event.data.startsWith(`info depth ${depth}`) && event.data.includes("multipv")) {
        // grab moveNum to check if this is final line, CP value, and UCI
        const wordsArr = event.data.split(" ");
        const cpIndex = wordsArr.indexOf("cp")
        const cp = wordsArr[cpIndex + 1];
        const moveNumIndex = wordsArr.indexOf("multipv")
        const moveNum = wordsArr[moveNumIndex + 1]
        const pvIndex = wordsArr.indexOf("pv")
        const moveUCI = wordsArr[pvIndex + 1]
        
        // update stockfishMoves with these values
        stockfishMoves[`move${moveNum}CP`] = cp;  
        stockfishMoves[`move${moveNum}UCI`] = moveUCI;  
        
        // if this is final line, return from promise successfully
        if (moveNum == 3) {
          resolve(stockfishMoves);

        // if it's best move, update eval
        } else if (moveNum == 1) {
          setCurrentEvaluation(cp)
        }
      }
    };
    
    // send in FEN position for this analysis and start analyzing to depth of depth
    stockfish.postMessage(`position fen ${fen}`)
    stockfish.postMessage(`go depth ${depth}`)
  });
}

function openLichessAnalysisBoard(fen) {
  const url = `https://lichess.org/analysis/${fen}`;

  window.open(url, '_blank');
}


function App() {
const [game, setGame] = useState(new Chess());
const [minELO, setMinELO] = useState("1800");
const [movesFoundLate, setMovesFoundLate] = useState(0);
const [randomPositionDisabled, setRandomPositionDisabled] = useState(false);
const [loadingAPIResponses, setLoadingAPIResponses] = useState(false);
const [arrows, setArrows] = useState([
  ['', '', ''],
  ['', '', ''],
  ['', '', '']
]);
const [currentEvaluation, setCurrentEvaluation] = useState(0);
const opening = useRef("random");
const allowDrop = useRef(false);
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
const displayMovesText = useRef(false)

// Define the onDrop function
function onDrop(sourceSquare, targetSquare) {
  try {
    // Check if the move is legal
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
    });
      // If the move is illegal, return false to revert
      if (move === null) return false;

      displayMovesText.current = true;
      // update yourMove
      yourMove.current = move.from + move.to;
      // Update the game state
      setGame(new Chess(game.fen()));
      allowDrop.current = false;
      if (loadingAPIResponses == false) {
        setArrows([[stockfishMove0.current["UCI"].substring(0, 2), stockfishMove0.current["UCI"].substring(2, 4), 'green'],
                  [stockfishMove1.current["UCI"].substring(0, 2), stockfishMove1.current["UCI"].substring(2, 4), 'yellow'],
                  [stockfishMove2.current["UCI"].substring(0, 2), stockfishMove2.current["UCI"].substring(2, 4), 'orange']]
      );
      }
      return true;
    } catch (error) {
      console.error("Error in onDrop:", error);
      return false;
    }
  }
  

  function displayOpening(new_opening, opening, setGame, allowDrag) {
    // re-set move text before re-render
    stockfishMove0.current["UCI"] = "";
    stockfishMove0.current["CP"] = "";
    stockfishMove1.current["UCI"] = "";
    stockfishMove1.current["CP"] = "";
    stockfishMove2.current["UCI"] = "";
    stockfishMove2.current["CP"] = "";
    masterMove0.current = "";
    masterMove1.current = "";
    masterMove2.current = "";
    normieMove0.current = "";
    normieMove1.current = "";
    normieMove2.current = "";
    yourMove.current = "";
    disableAnalysisBoardButton.current = true;
    displayPlayMoveText.current = false;
    displayMovesText.current = false;

    opening.current = new_opening;
    // Update the game state
    console.log(opening.current)
    console.log(openings_fen[opening.current])

    allowDrag.current = false

    setArrows([['', '', ''],
              ['', '', ''],
              ['', '', '']]);
    setGame(new Chess(openings_fen[new_opening]));
  }
  
  return (
<div className="container mx-auto p-2">
<div className="flex flex-col md:flex-row gap-2">
  {/* Add the evaluation bar */}
  <div className="hidden md:block" style={{ padding: '10px' }}>
    <EvalBar 
      evaluation={currentEvaluation} 
      isWhiteToMove={game.turn() === 'w'} 
      height={400} 
      width={30} 
    />
  </div>
  
    <div className="container mx-auto p-2">
      {/* Mobile: stacked, Desktop: side-by-side */}
      <div className="flex flex-col md:flex-row gap-2">
        {/* Chess board */}

        <div className="w-full md:w-2/3">
          <div className="max-w-lg mx-auto">
          <Chessboard position={game.fen()} onPieceDrop={onDrop} arePiecesDraggable={allowDrop.current} boardOrientation={chessboardOrientation.current} areArrowsAllowed={allowDrop.current} customArrows={arrows} animationDuration={300}/>
          </div>
          {displayPlayMoveText.current && <div className="text-center font-bold text-lg my-2 bg-blue-100 dark:bg-blue-900 rounded text-black dark:text-white max-w-lg mx-auto">
           {"Please play a move and compare with the best moves!"} 
          </div>}
          {/* Controls & Info */}
          <div className="w-full">
            <div className="rounded flex flex-col items-center text-center">
              <h2>Please Select an Opening to Study</h2>
              <select className="bg-white dark:bg-gray-700 text-black dark:text-white rounded border border-gray-300 dark:border-gray-600" onChange={(e) => displayOpening(e.target.value, opening, setGame, allowDrop)}>
                <option value="random">Random</option>
                <option value="italian">Italian Game</option>
                <option value="sicilian">Sicilian Defense</option>
                <option value="sicilian_yugoslov">Sicilian Defense Yugoslov Attack</option>
                <option value="french">French Defense</option>
                <option value="caro">Caro Kann</option>
              </select>
                <div>
                  <label htmlFor="eloInput">Enter ELO Rating (0-2500):</label>
                  <input
                  id="eloInput"
                  type="number"
                  min="0"
                  max="2500"
                  value={minELO}
                  onChange={(e) => updateMinELO(e.target.value, setMinELO)}
                  className="bg-white dark:bg-gray-700 text-black dark:text-white p-2 rounded border border-gray-300 dark:border-gray-600 w-full"/>
                </div>
              <button onClick={() => loadRandomPosition(chessboardOrientation, setGame, opening, minELO, allowDrop, stockfishMove0, stockfishMove1, stockfishMove2, masterMove0, masterMove1, masterMove2, normieMove0, normieMove1, normieMove2, yourMove, movesFoundLate, setMovesFoundLate, setRandomPositionDisabled, loadingAPIResponses, setLoadingAPIResponses, disableAnalysisBoardButton, analysisBoardFEN, displayPlayMoveText, setArrows, displayMovesText, setCurrentEvaluation)} 
              disabled={randomPositionDisabled}
              className={`mt-2 ${randomPositionDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : `bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-1 px-4 rounded`}`}>Generate Random Position</button>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/3">
          <div className="bg-cream-100 p-2 rounded">
            <h2 className="text-xl font-bold mb-4">Move Analysis</h2> 
              <h3 className="text-l font-bold mb-4">Your Move: {yourMove.current}</h3> 
              {loadingAPIResponses && <div className="loader flex items-center">
              <span className="pr-5 font-bold">Loading Best Moves</span>
              <ClipLoader
              color={"#00ff00"}
              loading={loadingAPIResponses.current}
              override={override}
              size={20}
              /></div>}
              {loadingAPIResponses && <div className="pb-5">Feel Free to Play Your Move in the Meantime</div>}
              <h3 className="text-l font-bold mb-4">Stockfish Best Moves</h3> 
              <p className="text-green-500">Stockfish Move 0: {displayMovesText.current ? `${stockfishMove0.current["UCI"]}, ${stockfishMove0.current["CP"]}` : ","}</p>
              <p className="text-yellow-500">Stockfish Move 1: {displayMovesText.current ? `${stockfishMove1.current["UCI"]}, ${stockfishMove1.current["CP"]}` : ","}</p>
              <p className="text-orange-500">Stockfish Move 2: {displayMovesText.current ? `${stockfishMove2.current["UCI"]}, ${stockfishMove2.current["CP"]}` : ","}</p>
              <h3 className="text-l font-bold mb-4">Popular Master Moves</h3> 
              <p>Master Move 1: {displayMovesText.current ? `${masterMove0.current}` : ""}</p>
              <p>Master Move 2: {displayMovesText.current ? `${masterMove1.current}` : ""}</p>
              <p>Master Move 3: {displayMovesText.current ? `${masterMove2.current}` : ""}</p>
              <h3 className="text-l font-bold mb-4">Popular Moves over {minELO}</h3> 
              <p>Move 0: {displayMovesText.current ? `${normieMove0.current}` : ""}</p>
              <p>Move 1: {displayMovesText.current ? `${normieMove1.current}` : ""}</p>
              <p>Move 2: {displayMovesText.current ? `${normieMove2.current}` : ""}</p>
            {!disableAnalysisBoardButton.current && <button onClick={() => openLichessAnalysisBoard(analysisBoardFEN.current)} 
            className={`mt-4 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}>Go To Lichess Analysis Board</button>}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  )
}

export default App