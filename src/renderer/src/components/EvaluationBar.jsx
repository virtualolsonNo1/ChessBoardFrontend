import {useEffect, useState} from 'react';
import { Chess } from 'chess.js';

const EvalBar = ({evaluation = 0, }) => {
    const [mateCount, setMateCount] = useState(0);
    const [hasMate, setHasMate] = useState(false);
    const [barHeight, setBarHeight] = useState(50);
    
    useEffect(() => {
        const evalParsed = parseEval(evaluation)
        let percentage = 50;
        if(hasMate) {
            percentage = mateCount > 0 ? 100 : 0
        } else {
            // up 5 is full bar, same with down 5, proportional till then
            percentage = 50 + (evalParsed * 10)
        }

        setBarHeight(percentage);

    }, [evaluation]);

    const parseEval = () => {
        if (typeof(evaluation) == 'string') { 
            if (evaluation.toLowerCase().startsWith('m')) {
                setHasMate(true); 
                setMateCount(evaluation.substring(1));
                return parseInt(evaluation.substring(1)) > 0 ? 100 : -100;
            
            } else {
                console.log("evaluation: ");
                console.log(evaluation);
                return parseFloat(evaluation) / 100.0;
            }
        }
        
        // return default value if parsing fails
        return 0;
    };
    
return (
        <div className="eval-bar" style={{
            width: '30px',
            height: '400px',
            backgroundColor: '#333',
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden'
        }}>
            {/* White bar growing from bottom */}
            <div className="eval-bar-white" style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: `${Math.max(0, Math.min(100, barHeight))}%`,
                backgroundColor: '#f0f0f0',
                transition: 'height 0.3s ease'
            }} />
            
            <div className="eval-bar-text" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                color: barHeight > 51 ? '#333' : '#f0f0f0',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                textShadow: '0px 0px 2px rgba(0,0,0,0.5)'
            }}>
                {Math.round((barHeight - 50) / 10 * 100) / 100}
            </div>
        </div>
    );

};

export default EvalBar;