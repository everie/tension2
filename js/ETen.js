/*
TENSION 2 - By Hans Elley
Game code
 */

(function () {
    Current.High = Defaults.Start;
    Current.RealHigh = Defaults.Start - 1;
    Current.Lives = Defaults.MaxLives;
    Current.NoRise = 0;
    Current.Blocks = [];

    GetSettings();

    ReSize();
    SetUpReset();
    SetUpUndo();
    SetUpAutoButton();

    let LastBlocks = LoadLastState();

    if (LastBlocks !== undefined && LastBlocks !== null) {
        PopulateLoaded(LastBlocks);
    } else {
        Current.Start = GetTimestamp();
        Populate();
    }

    UpdateScore();
    UpdateLives();
    UpdateLevel();
    SetUpBackground();
    DisplayNoRiseBuffer();

    Emit('InitDone');

    Listen('ReSize', function() {
        ReSize();
    });
})();



function SetUpReset() {
    let Resets = document.querySelectorAll('.ResetGame');

    Resets.forEach(element => {
        element.onclick = function() {
            ResetGame();
        };
    });
}

function ResetGame() {
    let End = document.querySelector('#InnerGameOverlay');
    let Background = document.querySelector('#BackGround');
    Background.innerHTML = '';

    localStorage.setItem(Defaults.LocalGameData, '');

    Current['High'] = Defaults.Start;
    Current['RealHigh'] = Defaults.Start - 1;
    Current['Blocks'] = [];
    Current['Selected'] = [];
    Current['Background'] = [];
    Current['Score'] = 0;
    Current['Move'] = 0;
    Current['Merges'] = {};
    Current['Start'] = GetTimestamp();
    Current['Undo'] = {
        Count: Defaults.UndoMax,
        Moves: Defaults.UndoIncrease,
        Can: false
    };
    Current['Lives'] = Defaults.MaxLives;
    Current['Level'] = 0;
    Current['NoRise'] = 0;

    End.style.display = 'none';

    Populate();
    UpdateScore();
    UpdateLives();
    UpdateLevel();
    SetUpUndo();
    SetUpAutoButton();

    SetUpBackground();
    DisplayNoRiseBuffer();
}

function SetUpAutoPlay(On) {
    if (On) {
        Listen('MoveDone', AutoPlayEvent);
        Listen('InitDone', AutoPlayEvent);
    } else {
        Unlisten('MoveDone', AutoPlayEvent);
        Unlisten('InitDone', AutoPlayEvent);
    }
}

function AutoPlayEvent() {
    if (Current.Auto) {
        let Groups = CalculateBlockGroups().Groups;

        if (Current.AutoTimer !== null)
            clearTimeout(Current.AutoTimer);

        Current.AutoTimer = null;

        ClearAllSelected();

        if (Groups.length > 0) {
            let G = Random(0, Groups.length - 1);
            let B = Random(0, Groups[G].length - 1);

            // console.log('row', Groups.length - 1, Groups, 'selected', G);
            // console.log('blo', Groups[G].length - 1, Groups[G], 'selected', B);

            let Block = Groups[G][B];
            Block.Self.click();

            Current.AutoTimer = setTimeout(function() {
                if (Current.Auto)
                    Block.Self.click();
            }, 400);
        }
    }
}

function SetUpAutoButton() {
    let Button = document.querySelector('.AutoGame');
    let OffClass = 'off';
    InitAutoPlay(false);
    Button.classList.add(OffClass);

    Button.onclick = function() {
        if (Button.classList.contains(OffClass)) {
            Button.classList.remove(OffClass);
            // TURN ON
            InitAutoPlay(true);
        } else {
            Button.classList.add(OffClass);
            // TURN OFF
            InitAutoPlay(false);
        }
    }
}

function InitAutoPlay(Start = true) {
    let Button = document.querySelector('.AutoGame');
    let OffClass = 'off';

    Current.Auto = Start;

    if (!Start) {
        SetUpAutoPlay(false);
        Button.classList.add(OffClass);
    } else {
        SetUpAutoPlay(true);
        Emit('MoveDone');
    }
}

function ClearAllSelected() {
    if (Current.HasSelect()) {
        Current.Selected.forEach(a => {
            a.Self.classList.remove('Selected');
        });

        Current.Selected = [];
    }
}

function SetUpBackground() {
    let Container = document.querySelector('#BackGround');

    if (Current.Background.length > 0) {
        Container.innerHTML = '';
        let B = GetAllBackgroundPositions();

        Current.Background.filter(a => a.Num !== null).forEach(a => {
            let f = B.filter(b => a.Y === b.Y).First();

            if (f !== null)
                a['Pos'] = f.Pos;

            let Div = CreateBackgroundBar(a);
            Container.appendChild(Div.Element);
        });


    } else {
        CreateNewBackgroundBars(true);
    }
}

function CreateBackgroundBar(Bar, First = false) {
    let div = document.createElement('div');
    let Num = 0;

    if (First) {
        Num = 1;
    } else {
        if (Bar.Num !== undefined && Bar.Num !== null) {
            Num = Bar.Num;
        } else {
            Num = Current.RealHigh;
        }
    }

    div.className = 'background-bar';
    div.style.height = Current.BlockSize + 'px';
    div.style.top = Bar.Pos + 'px';
    div.dataset.pos = Bar.Y;
    div.dataset.num = Num;

    let inner = CreateInnerBackgroundBar(Num);
    div.appendChild(inner);

    return {
        Element: div,
        Y: Bar.Y
    };
}

function CreateInnerBackgroundBar(Num) {
    let inner = document.createElement('div');
    inner.className = 'inner-background-bar';

    //inner.style.background = 'linear-gradient(0deg, ' + GetNumColour2(Num) + ' 50%, ' + GetNumColour3(Num) + ' 50%, ' + GetNumColour(Num) + ' 75%)';
    inner.style.background = 'linear-gradient(0deg, ' + GetNumColour2(Num) + ' 50%, ' + GetNumColour(Num) + ' 50%)';

    return inner;
}

function ScrollBackgroundAnimation(Bar, Amount, Callback) {
    let Pos = parseInt(Bar.dataset.pos);
    let P1 = Pos;
    let P2 = P1 - Amount;

    let StartPos = GetBackgroundPosOne();

    let Y1 = StartPos + (P1 * Current.BlockSize);
    let Y2 = StartPos + (P2 * Current.BlockSize);

    Bar.dataset.pos = P2;

    Bar.Animate(
        { top: Y1 + 'px' },
        { top: Y2 + 'px' },
        {
            duration: Defaults.Scrolling.Speed * Amount,
            easing: Defaults.Scrolling.Easing,
            fill: 'forwards'
        },
        Callback
    );
}

function SetUpUndo() {
    let Button = document.querySelector('#GameUndo');
    Current.Undo = {
        Count: Defaults.UndoMax,
        Moves: Defaults.UndoIncrease
    }
    UpdateUndo();

    Button.onclick = function() {
        GameUndoMove();
    }
}

function GameUndoMove() {
    if (Current.Undo.Can && !Current.Busy && Current.Undo.Count > 0) {
        let LastBlocks = LoadLastState(Defaults.LocalLastState);

        if (LastBlocks !== undefined && LastBlocks !== null) {
            Current.Blocks = [];
            Current.Undo.Count--;
            Current.Undo.Moves = Defaults.UndoIncrease;
            Current.Undo.Can = false;

            PopulateLoaded(LastBlocks);

            UpdateScore();
            UpdateLives();
            UpdateLevel();
            StoreCurrentState(false);
            ClearLastState();
            SetUpBackground();
            UpdateUndo();
            Emit('InitDone');
        }
    }
}

function UpdateUndo() {
    if (Current.Undo !== undefined && Current.Undo !== null) {
        let Button = document.querySelector('#GameUndo');
        let Counter = document.querySelector('#GameUndoCount');

        if (!Current.Undo.Can || Current.Undo.Count < 1) {
            Button.classList.add('disabled');
        } else {
            Button.classList.remove('disabled');
        }

        Counter.innerHTML = Current.Undo.Count;
    }
}

function UpdateUndoMoves() {
    if (Current.Undo === undefined || Current.Undo === null) {
        Current.Undo = {
            Count: Defaults.UndoMax,
            Moves: Defaults.UndoIncrease,
            Can: false
        }
    }

    Current.Undo.Can = true;
    Current.Undo.Moves--;

    if (Current.Undo.Moves < 1) {
        if (Current.Undo.Count < 3)
            Current.Undo.Count++;

        Current.Undo.Moves = Defaults.UndoIncrease;
    }
}

function Populate() {
    const Inner = document.querySelector('#InnerGame');
    Inner.innerHTML = '';

    for (let y = 0; y < Defaults.Size; y++) {
        for (let x = 0; x < Defaults.Size; x++) {
            if (Defaults.StartingLayout[y][x] === 1) {
                let div = CreateGameSquare(x, y, SquareChoice());

                Current.Blocks.push(div);
                Inner.appendChild(div);
            }
        }
    }

    CalculateOptions();
    CheckLives();
}

function PopulateLoaded(LastBlocks) {
    const Inner = document.querySelector('#InnerGame');
    Inner.innerHTML = '';

    LastBlocks.forEach(function(Block) {
        let div = CreateGameSquare(Block.X - 1, Block.Y - 1, Block.Num, Block.B);

        Current.Blocks.push(div);
        Inner.appendChild(div);
    });

    CalculateOptions();
    CheckLives();
}

function CreateGameSquare(x, y, num, b = null) {
    const Size = SquareSize();

    let div = document.createElement('div');
    let overlay = document.createElement('div');

    div.className = 'InnerSquare';
    div.style.height = Size + 'px';
    div.style.width = Size + 'px';

    div.style.left = x * Size + 'px';
    div.style.top = y * Size + 'px';

    let X = x + 1;
    let Y = y + 1;

    div.dataset.x = X;
    div.dataset.y = Y;
    div.dataset.num = num;
    div.dataset.id = 'X' + X + 'Y' + Y;

    SetBonusOverlay(div, b);

    overlay.className = 'InnerOverlay';
    //overlay.style.backgroundColor = GetNumColour(num);
    overlay.style.background = 'linear-gradient(0deg, ' + GetNumColour2(num) + ' 0%, ' + GetNumColour(num) + ' 100%)';
    overlay.style.color = GetNumColour3(num);
    overlay.innerHTML = num;

    div.appendChild(overlay);

    if (num < 10) {
        div.onclick = function() {
            if (!Current.Busy) {
                if (Current.HasSelect()) {
                    if (Current.Selected.filter(a => a.ID === this.dataset.id).length > 0) {
                        // REMOVE SELECTED
                        StoreLastState();
                        RemoveAllFriends(this, function() {
                            UpdateUndoMoves();

                            Current.Busy = false;
                            UpdateUndo();
                            Emit('MoveDone');
                        });
                    } else {
                        // DESELECT - CLICKED OUTSIDE
                        SelectDeselect(Current.Selected, false, function() {
                            //console.log('done deselected');
                            Emit('SelectDone');
                        });
                    }

                } else {
                    // SELECT
                    GetAllFriends(this);
                }
            }
        }
    }

    return div;
}

function ReSize() {
    const GameContainer = document.querySelector('#GameContainer');
    const GameProgress = document.querySelector('#GameProgress');
    const GameProgressBottom = document.querySelector('#GameProgressBottom');

    const WindowHeight = window.innerHeight;
    const WindowWidth = GetSize('#Game').width;

    let Size = Math.round(WindowHeight > WindowWidth ? WindowWidth : WindowHeight * 0.7);

    let AvailableSize = Size;
    let MaxSize = 800;
    let GameSize = AvailableSize > MaxSize ? MaxSize : AvailableSize;
    Current.GameSize = GameSize;
    Current.FontSize = (GameSize / Defaults.Size) * 0.5;
    Current.ScoreSize = (GameSize / Defaults.Size) * 0.25;

    GameContainer.style.height = GameSize + 'px';
    GameContainer.style.width = GameSize  + 'px';
    GameProgress.style.width = GameSize + 'px';
    GameProgressBottom.style.width = GameSize + 'px';


    GameContainer.style.fontSize = Current.FontSize + 'px';

    ResizeSquares();
    ResizeBackground();
}

function SquareSize() {
    const Inner = document.querySelector('#InnerGame');

    return GetSize2(Inner).width / Defaults.Size;
}

function ResizeSquares() {
    const Squares = document.querySelectorAll('.InnerSquare');
    let Square = SquareSize();

    Current.BlockSize = Square;

    Squares.forEach((S) => {
        let ds = S.dataset;

        S.style.width = Square + 'px';
        S.style.height = Square + 'px';
        S.style.left = ((ds.x - 1) * Square) + 'px';
        S.style.top = ((ds.y - 1) * Square) + 'px';
    });
}

function ResizeBackground() {
    const Bars = document.querySelectorAll('.background-bar');
    let Height = Current.BlockSize;
    let StartPos = GetBackgroundPosOne();

    Bars.forEach((B) => {
        let Pos = parseInt(B.dataset.pos);

        B.style.top = StartPos + (Pos * Current.BlockSize) + 'px';
        B.style.height = Height + 'px';
    });
}

function GetAllBackgroundPositions(WithNum = false) {
    let Inner = document.querySelector('#InnerGame');
    let IP = Inner.getBoundingClientRect();

    let Pos0 = IP.top + (Current.GameSize - Current.BlockSize) - 16;

    let Y = 0;
    let Pos = Pos0;

    let Bars = [{
        Y: Y,
        Pos: Pos
    }];

    // UNDERS
    while (Pos < window.screen.height + (1 * Current.BlockSize)) {
        Y++;
        Pos = Pos0 + (Y * Current.BlockSize);

        Bars.push({
            Y: Y,
            Pos: Pos
        });
    }

    Y = 0;
    Pos = Pos0;

    // OVERS
    while (Pos > -Current.BlockSize) {
        Y--;
        Pos = Pos0 + (Y * Current.BlockSize);

        Bars.push({
            Y: Y,
            Pos: Pos
        });
    }

    if (WithNum)
        Bars.map(a => {
            let Div = document.querySelector('.background-bar[data-pos="' + a.Y + '"]');
            
            if (Div !== null)
                a['Num'] = parseInt(Div.dataset.num);

            return a;
        });

    return SortByKey(Bars, 'Y', true);
}

function GetBackgroundPosOne() {
    return GetAllBackgroundPositions().filter(a => a.Y === 0).First().Pos;
}

function GetFriends(element, matching) {
    let x = parseInt(element.dataset.x);
    let y = parseInt(element.dataset.y);
    let num = parseInt(element.dataset.num);
    let bonus = element.dataset.bonus !== undefined;

    let numCheck = '';

    if (matching)
        numCheck = '[data-num="' + num + '"]';

    return {
        Self: element,
        ID: 'X' + x + 'Y' + y,
        Num: num,
        Bonus: bonus,
        Left: document.querySelector('.InnerSquare[data-x="' + (x - 1) + '"][data-y="' + y + '"]' + numCheck),
        Right: document.querySelector('.InnerSquare[data-x="' + (x + 1) + '"][data-y="' + y + '"]' + numCheck),
        Over: document.querySelector('.InnerSquare[data-y="' + (y - 1) + '"][data-x="' + x + '"]' + numCheck),
        Under: document.querySelector('.InnerSquare[data-y="' + (y + 1) + '"][data-x="' + x + '"]' + numCheck),
        X: x,
        Y: y
    };
}

function TraverseFriends(element, arr) {
    let F = GetFriends(element, true);

    if (arr.filter(a => a.ID === F.ID).length < 1) {
        arr.push(F);
    }

    ValidateFriend(F.Left, arr);
    ValidateFriend(F.Right, arr);
    ValidateFriend(F.Over, arr);
    ValidateFriend(F.Under, arr);
}

function ValidateFriend(element, arr) {
    if (element !== null) {
        let F = GetFriends(element, true);

        if (arr.filter(a => a.ID === F.ID).length < 1) {
            arr.push(F);
            TraverseFriends(element, arr);
        }
    }
}

function GetAllFriends(element) {
    let Friends = [];
    TraverseFriends(element, Friends);

        if (Friends.length > 1) {
            Current.Selected = Friends;

            SelectDeselect([...Current.Selected], true, function() {
                //console.log('done selected');
            });
        } else {
            Current.Selected = [];
        }
}

function RemoveAllFriends(element, callback) {
    Current.Busy = true;
    let High = Current.RealHigh;
    let Bonus = (element.dataset.bonus ? parseInt(element.dataset.bonus) : 1);

    //ClearBonusBlock();

    let Friends = [];
    TraverseFriends(element, Friends);

    if (Friends.length > 1) {
        Current.Empties = [];

        Current.Selected = Friends;
        let SelectedBlocks = Current.Selected.length;
        let Score = CalcScore(Bonus);
        UpdateMergeStats(element.dataset.num, SelectedBlocks);

        let Blocks = [Current.Selected[0], ...Shuffle(Current.Selected.slice(1))];

        MergeSynced(element, Blocks, function() {
            //console.log('done merged', Score);
            Current.Selected = [];

            UpdateScore(Score, true);
            ShowScoreAnimation(element, Score, function() {
               //console.log('showed score.');
            });

            CreateNewBlock(element, function() {
                // FIND GAPS
                let Gaps = FindGaps(Current.Empties);
                // FIND BLOCKS ON TOP
                let Stacks = FindStacked(Gaps);

                FillGapsSynced(Stacks, function() {

                    DisplayNewHigh(High,function() {
                        let Options = 0;
                        async.whilst(cb => { cb(null, Options < 1) }, Next => {

                            FillEmptySquares2(function(Levels) {
                                UpdateLevel(Levels);
                                let Opt = CalculateBlockGroups();
                                Options = Opt.Options;

                                if (Options > 0)
                                    SetBonusBlock(Opt.Groups, SelectedBlocks);

                                UpdateOptions(Options);
                                ClearOldBackgroundBarsAndCreateNew();
                                StoreCurrentStateAndBackground();

                                if (Current.Lives < 1) {
                                    Next(true, Opt.Options);
                                } else {
                                    Next(null);
                                }
                            });

                        }, (end) => {
                            if (end)
                                EndGame(true);

                            callback();
                        });

                    });



                });
            });

        });
    } else {
        Current.Selected = [];
    }
}

function StoreCurrentStateAndBackground() {
    Current.Background = GetAllBackgroundPositions(true).map(a => {
        return {
            Y: a.Y,
            Num: a.Num ? a.Num : null
        };
    });

    StoreCurrentState();
}

function SetBonusBlock(Groups, Selected) {
    let Pct = Selected / Math.pow(Defaults.Size, 2);
    let Bonus = BonusChoice(Pct);

    // FILTERING OUT BONUS BLOCKS
    Groups = Groups.map(a => {
        return a.filter(b => !b.Bonus);
    }).filter(a => a.length > 0);

    if (Bonus > 1) {
        let G = Random(0, Groups.length - 1);
        let B = Random(0, Groups[G].length - 1);

        //let Group = Shuffle(Groups).pop();
        //let Block = Shuffle(Group).shift();

        let Block = Groups[G][B];

        if (Block !== undefined && Block !== null) {
            SetBonusOverlay(Block.Self, Bonus);
            Block.Self.dataset.bonus = Bonus;
        }
    }
}

function SetBonusOverlay(Element, Bonus) {
    if (Bonus !== undefined && Bonus !== null) {
        Element.dataset.bonus = Bonus;

        let overlay = document.createElement('div')
        let bonus = document.createElement('div');

        overlay.className = 'BonusOverlay X' + Bonus;
        bonus.className = 'BonusOverlayText X' + Bonus;

        bonus.innerHTML = 'x' + Bonus;

        Element.appendChild(bonus);
        Element.appendChild(overlay);
    }
}

function DisplayNoRiseBuffer(Clear = false) {
    let Buffer = document.querySelector('#InnerGameBufferOverlay');

    if (Clear)
        Current.NoRise = 0;

    if (Current.NoRise > 0) {
        Buffer.style.opacity = 1;
    } else {
        Buffer.style.opacity = 0;
    }
}

function UpdateMergeStats(Num, Count) {
    if (Current.Merges === undefined || Current.Merges === null)
        Current.Merges = {};

    let N = Current.Merges[Num];

    if (N !== undefined && N !== null) {
        Current.Merges[Num]['Amount']++;
        Current.Merges[Num]['Blocks'] += Count;
    }
    else
        Current.Merges[Num] = {
            Amount: 1,
            Blocks: Count
        };
}

function UpdateScore(Score = 0, Animate = false) {
    let Points = document.querySelector('#Points');
    let Moves = document.querySelector('#Moves');
    let OldPoints = Current.Score;

    if (Score > 0) {
        Current.Score += Score;
        Current.Move++;
    }

    if (Animate) {
        ScoreCountUpAnimation(Points, OldPoints, Current.Score);
    } else {
        Points.innerHTML = FormatNumber(Current.Score);
    }

    Moves.innerHTML = FormatNumber(Current.Move);
}

function UpdateLevel(Level = 0) {
    let Div = document.querySelector('#Level');

    if (Level > 0)
        Current.Level += Level;

    Div.innerHTML = FormatNumber(Current.Level);
}

function UpdateOptions(Options) {
    let Div = document.querySelector('#Options');
    Current.Options = Options;

    Div.innerHTML = FormatNumber(Options);
}

function CheckLives() {
    if (Current.Lives < 1) {
        EndGame(false);
    }
}

function UpdateLives(Lives = 0) {
    let Div = document.querySelector('#Lives');

    let OldLives = Current.Lives;

    if (Lives > 0)
        Current.Lives -= Lives;

    ScoreCountUpAnimation(Div, OldLives, Current.Lives);
}

function CalculateOptions() {
    let Opts = document.querySelector('#Options');

    let Opt = CalculateBlockGroups();

    Current.Options = Opt.Options;
    Opts.innerHTML = FormatNumber(Opt.Options);
}

function CalculateBlockGroups() {
    let Seen = [];
    let Groups = [];
    //let Options = 0;

    Current.Blocks.forEach(function(Block) {
        if (Seen.filter(a => a.ID === Block.dataset.id).length < 1) {
            let Friends = [];
            TraverseFriends(Block, Friends);

            if (Friends.length > 1) {
                //Options++;
                Seen.push(...Friends);
                Groups.push(Friends);
            }
        }
    });

    return {
        Options: Groups.length,
        Groups: Groups
    }
}

function EndGame(Update) {
    let End = document.querySelector('#InnerGameOverlay');
    let GamePos = document.querySelector('#GamePosition');
    let GameLink = document.querySelector('#GameLink');
    let GamePosCont = document.querySelector('#GamePositionContainer');
    End.style.display = 'flex';
    InitAutoPlay(false);

    if (Update) {
        let LastState = SaveLastStateOnEnd();

        if (LastState.Position < 1) {
            GamePos.innerHTML = "None";
            GameLink.style.display = 'none';
        } else {
            GamePos.innerHTML = LastState.Position;

            GameLink.href = 'score.html?id=' + LastState.ID;
            GameLink.style.display = 'block';
        }

        GamePosCont.style.display = 'block';

    } else {
        GamePosCont.style.display = 'none';
        GameLink.style.display = 'none';
    }
}

function FillEmptySquares2(callback) {
    const EmptyRows = ObjAsArray(GroupByY(GetAllEmptySquares()));

    let Rows = EmptyRows.map(a => {
        return {
            Blocks: a,
            Empty: a.length === Defaults.Size
        };
    }).filter(a => a.Empty);

    // TAKE A ROW
    if (Rows.length > 1)
        Rows.pop();

    let Levels = Rows.length;

    if (Levels > 0) {
        DisplayNoRiseBuffer(true);
        CreateNewRows(Rows);

        MoveBackgroundUp(Levels);
        MoveAllBlocksUp(Levels, function() {
            callback(Levels);
        });
    } else {
        let AutoRow = 1;
        Current.NoRise++;

        DisplayNoRiseBuffer();

        if (Current.NoRise > Defaults.NoRiseBuffer) {
            CreateNewRowsAuto();
            MoveBackgroundUp(AutoRow);

            MoveAllBlocksUp(AutoRow, function() {
                DetectDeadSquares();
                DisplayNoRiseBuffer(true);

                callback(AutoRow);
            });
        } else {
            callback(0);
        }
    }


}

function CreateNewRows(Rows) {
    const Inner = document.querySelector('#InnerGame');

    Rows.forEach(Row => {

        Row.Blocks.forEach(Block => {
            let div = CreateGameSquare(Block.X, Block.Y + Defaults.Size, SquareChoice());

            Current.Blocks.push(div);
            Inner.appendChild(div);
        });

    });
}

function CreateNewRowsAuto() {
    const Inner = document.querySelector('#InnerGame');

    for (let i = 0; i < Defaults.Size; i++) {
        let div = CreateGameSquare(i, Defaults.Size, SquareChoice());

        Current.Blocks.push(div);
        Inner.appendChild(div);
    }
}

function MoveAllBlocksUp(Amount, Callback) {
    let Blocks = Current.BlocksAsObj(true);
    Current.NoRise = 0;

    async.each(Blocks, function(Block, Next) {
        RiseBlockAnimation(Block, Amount, Next);
    }, function(err) {
        if (err)
            console.log(err);

        Callback();
    });
}

function MoveBackgroundUp(Amount, Callback) {
    let Bars = document.querySelectorAll('.background-bar');

    async.each(Bars, function(Bar, Next) {
        if (Bar !== null)
            ScrollBackgroundAnimation(Bar, Amount, Next);
    }, function(err) {
        if (err)
            console.log(err);

        if (Callback)
            Callback();
    });
}

function ClearOldBackgroundBarsAndCreateNew() {
    let Bars = document.querySelectorAll('.background-bar');
    let Top = -Current.BlockSize;

    Bars.forEach(Bar => {
       let B = Bar.getBoundingClientRect();

       if (B.top < Top)
           Bar.remove();
    });

    CreateNewBackgroundBars();
}

function CreateNewBackgroundBars(First = false) {
    let Container = document.querySelector('#BackGround');
    let Bars = GetAllBackgroundPositions().filter(a => a.Y >= 0);

    Bars.forEach(a => {
        let Bar = document.querySelector('.background-bar[data-pos="' + a.Y + '"]');

        if (a.Pos > (window.screen.height - Current.BlockSize) && Bar !== null) {
            Bar.remove();
            Bar = null;
        }

        if (Bar === null) {
            let Div = CreateBackgroundBar(a, First);

            Container.appendChild(Div.Element);
            First = false;
        }
    });
}

function DetectDeadSquares() {
    let Blocks = Current.BlocksAsObj(true).filter(a => a.Y < 1).map(a => {
        return {
            ID: 'X' + a.X + 'Y' + a.Y,
            Num: a.Num,
            Element: a.Self
        };
    });

    let Lives = Blocks.reduce((a, b) => { return a + b.Num; }, 0);

    UpdateLives(Lives);

    Blocks.forEach(a => {
        ShowLifeAnimation(a.Element, a.Num);

        Current.Blocks = Current.Blocks.filter(block => block.dataset.id !== a.ID);
        a.Element.remove();
    });
}

function ScoreCountUpAnimation(Container, From, To) {
    let Timer = 200;
    let Steps = 8;

    let Difference = To - From;
    let PrStep = Difference / Steps;

    ScoreCounter(Container, From, To, Steps, PrStep, Timer / Steps);
}

function ScoreCounter(Container, Value, ValueEnd, Step, StepAmount, Timer) {
    if (Step > 0) {
        setTimeout(function() {
            Value += StepAmount;
            Step--;

            Container.innerHTML = FormatNumber(Value);

            ScoreCounter(Container, Value, ValueEnd, Step, StepAmount, Timer);
        }, Timer);
    } else {
        Container.innerHTML = FormatNumber(ValueEnd);
    }
}

function ShowScoreAnimation(Block, Score, Callback) {
    let Inner = document.querySelector('#InnerGameMessages');

    let Rise = Current.BlockSize * 0.5;

    let X = parseInt(Block.dataset.x) - 1;
    let Y = parseInt(Block.dataset.y) - 1;
    let Top1 = ((Current.BlockSize * Y));
    let Top2 = ((Current.BlockSize * Y)) - (Rise * 0.6);
    let Top3 = ((Current.BlockSize * Y)) - Rise;

    let F1 = Current.ScoreSize * 0.5;
    let F2 = Current.ScoreSize;
    let F3 = Current.ScoreSize * 1.5;

    let Div = document.createElement('div');
    Div.className = 'ScoreDisplay';
    Div.style.width = (Current.BlockSize * 2) + 'px';
    Div.style.height = (Current.BlockSize) + 'px';

    Div.style.left = ((Current.BlockSize) * X - (Current.BlockSize / 2)) + 'px';
    Div.style.top = Top1 + 'px';

    Div.style.fontSize = Current.ScoreSize + 'px';

    Div.innerHTML = '+' + FormatNumber(Score);
    Inner.appendChild(Div);

    Div.Animate(
        { top: Top1 + 'px', opacity: 0, fontSize: F1 + 'px' },
        { top: Top2 + 'px', opacity: 1, fontSize: F2 + 'px' },
        {
            duration: 300,
            easing: 'ease-in',
            fill: 'forwards'
        },
        function() {

            Div.Animate(
                { top: Top2 + 'px', opacity: 1, fontSize: F2 + 'px' },
                { top: Top3 + 'px', opacity: 0, fontSize: F3 + 'px' },
                {
                    duration: 250,
                    easing: 'ease-out',
                    fill: 'forwards'
                },
                function() {
                    Div.remove();
                    Callback();
                }
            );

        }
    );
}

function ShowLifeAnimation(Block, Lives, Callback) {
    let Inner = document.querySelector('#InnerGameMessages');

    let Rise = Current.BlockSize * 0.5;

    let X = parseInt(Block.dataset.x) - 1;
    let Y = parseInt(Block.dataset.y);
    let Top1 = ((Current.BlockSize * Y));
    let Top2 = ((Current.BlockSize * Y)) - (Rise * 0.6);
    let Top3 = ((Current.BlockSize * Y)) - Rise;

    let F1 = Current.ScoreSize * 0.5;
    let F2 = Current.ScoreSize;
    let F3 = Current.ScoreSize * 1.5;

    let Div = document.createElement('div');
    Div.className = 'LifeDisplay';
    Div.style.width = (Current.BlockSize * 2) + 'px';
    Div.style.height = (Current.BlockSize) + 'px';

    Div.style.left = ((Current.BlockSize) * X - (Current.BlockSize / 2)) + 'px';
    Div.style.top = Top1 + 'px';

    Div.style.fontSize = Current.ScoreSize + 'px';

    Div.innerHTML = '-' + FormatNumber(Lives);
    Inner.appendChild(Div);

    Div.Animate(
        { top: Top1 + 'px', opacity: 0, fontSize: F1 + 'px' },
        { top: Top2 + 'px', opacity: 1, fontSize: F2 + 'px' },
        {
            duration: 400,
            easing: 'ease-in',
            fill: 'forwards'
        },
        function() {

            Div.Animate(
                { top: Top2 + 'px', opacity: 1, fontSize: F2 + 'px' },
                { top: Top3 + 'px', opacity: 0, fontSize: F3 + 'px' },
                {
                    duration: 300,
                    easing: 'ease-out',
                    fill: 'forwards'
                },
                function() {
                    Div.remove();

                    if (Callback)
                        Callback();
                }
            );

        }
    );
}

function CreateNewBlock(source, callback) {
    const Inner = document.querySelector('#InnerGame');

    let x = source.dataset.x - 1;
    let y = source.dataset.y - 1;
    let num = parseInt(source.dataset.num);
    num++;

    let div = CreateGameSquare(x, y, num);

    Current.Blocks.push(div);
    Inner.appendChild(div);

    div.style.opacity = '0';

    SpawnBlockAnimation(div, function() {
        IncreaseHighest(num, callback);
    });
}

function IncreaseHighest(Num, Callback) {
    if (Num > Current.High) {
        Current.High = Num;
    }

    if (Num > Current.RealHigh) {
        Current.RealHigh = Num;

        Callback();
    } else {
        Callback();
    }
}

function DisplayNewHigh(High, Callback) {
    if (High < Current.RealHigh) {

        let Bars = GetAllBackgroundPositions(true).filter(a => a.Num !== undefined && a.Num !== null && a.Y > 0).reverse();
        let Last = Bars.Last();

        async.eachSeries(Bars, function(Bar, Next) {
            AnimateBackgroundIncrease(Bar, function() {
                if (Bar.Y === Last.Y) {
                    Next();
                }
            });

            if (Bar.Y !== Last.Y) {
                setTimeout(function() {
                    Next();
                }, 80);
            }

        }, function(err) {
            if (err)
                console.log(err);

            if (Callback)
                Callback();
        });

    } else {
        Callback();
    }
}

function AnimateBackgroundIncrease(Bar, Callback) {
    let Div = document.querySelector('.background-bar[data-pos="' + Bar.Y + '"]');
    Bar.Num++;

    if (Div !== null) {
        Div.dataset.num = Bar.Num;
        let Old = Div.querySelector('.inner-background-bar');

        Old.Style({
            left: 'auto',
            right: 0
        });

        let New = CreateInnerBackgroundBar(Bar.Num);
        Div.appendChild(New);

        Old.Animate({
            width: '100%'
        }, {
            width: '0%'
        }, {
            duration: 160,
            easing: 'ease-in-out',
            fill: 'forwards'
        }, function() {
            Old.remove();
        });

        New.Animate({
            width: '0%'
        }, {
            width: '100%'
        }, {
            duration: 160,
            easing: 'ease-in-out',
            fill: 'forwards'
        }, Callback);
    }
}

function SelectDeselect(arr, on, callback) {
    if (arr.length > 0) {
        if (on) {
            let a = arr.shift();
            a.Self.classList.add('Selected');

            /*
            if (a.Left === null) a.Self.style.borderLeftWidth = '2px';
            if (a.Right === null) a.Self.style.borderRightWidth = '2px';
            if (a.Over === null) a.Self.style.borderTopWidth = '2px';
            if (a.Under === null) a.Self.style.borderBottomWidth = '2px';
             */

        } else {
            let a = arr.pop();

            a.Self.style.borderWidth = '0';
            a.Self.classList.remove('Selected');
        }

        setTimeout(function() {
            SelectDeselect(arr, on, callback);
        }, 14);
    } else {
        callback();
    }
}

function FillGapsSynced(Stacks, callback) {
    let ID = 0;
    const End = Stacks.length;

    if (Stacks.length > 0) {
        async.eachSeries(Stacks, function(Stack, Next) {

            SinkStackAnimation({ ID: ID, Stack: Stack }, function() {
                ID++;

                if (ID === End)
                    callback();
            });

            setTimeout(function() {
                Next();
            }, 10);

        }, function(err) {
            if (err)
                console.log(err);
        });
    } else {
        callback();
    }
}

function MergeSynced(source, arr, callback) {
    const Last = arr[arr.length - 1];

    async.eachSeries(arr, function(a, next) {

        if (source.dataset.id !== a.ID) {
            Current.Empties.push({
                X: a.X,
                Y: a.Y
            });
        }

        MergeAnimation(source, a, function() {
            if (a.ID === Last.ID) {
                next();
            }
        });

        setTimeout(function() {
            if (a.ID !== Last.ID) {
                next();
            }

        }, 30);

    }, function(err) {
        if (err)
            console.log(err);

        callback();
    });

}

function MergeAnimation(Source, Element, Callback) {
    const Inner = document.querySelector('#InnerGame');

    let Copy = Element.Self.cloneNode(true);

    Inner.appendChild(Copy);
    Element.Self.remove();
    Current.Blocks = Current.Blocks.filter(a => a.dataset.id !== Element.ID);

    Copy.style.zIndex = '5';

    const To = GetXY(Source);
    const From = {
        X: Element.X,
        Y: Element.Y,
        BX: (Element.X - 1) * Current.BlockSize,
        BY: (Element.Y - 1) * Current.BlockSize
    };

    let Size1 = Current.BlockSize;
    let Size2 = Current.BlockSize * 1.4;
    let Size3 = Size2 * 0.5;
    let SizeDelta = Size2 - Size1;
    let SizeAdjust = SizeDelta / 2;

    let FS1 = Current.FontSize;
    let FS2 = FS1 * 1.3;
    let FS3 = FS2 * 0.6;

    let Size3Adjust = (Size1 - Size3) / 2;

    const ToX = (To.X - 1) * Current.BlockSize + Size3Adjust;
    const ToY = (To.Y - 1) * Current.BlockSize + Size3Adjust;

    Copy.Animate(
        { width: Size1 + 'px', height: Size1 + 'px', left: (From.BX) + 'px', top: (From.BY) + 'px', fontSize: FS1 + 'px' },
        { width: Size2 + 'px', height: Size2 + 'px', left: (From.BX - SizeAdjust) + 'px', top: (From.BY - SizeAdjust) + 'px', fontSize: FS2 + 'px' },
        {
            duration: 200,
            easing: 'ease-in',
            fill: 'forwards'
        },
        function() {

            Copy.Animate(
                { left: (From.BX - SizeAdjust) + 'px', top: (From.BY - SizeAdjust) + 'px', opacity: 1, width: Size2 + 'px', height: Size2 + 'px', fontSize: FS2 + 'px' },
                { left: (ToX) + 'px', top: (ToY) + 'px', opacity: 0.4, width: Size3 + 'px', height: Size3 + 'px', fontSize: FS3 + 'px' },
                {
                    duration: 100,
                    easing: 'ease-out',
                    fill: 'forwards'
                },
                function() {

                    Copy.Animate(
                        { opacity: 0.4 },
                        { opacity: 0 },
                        {
                            duration: 40,
                            easing: 'ease-in',
                            fill: 'forwards'
                        },
                        function() {
                            Copy.remove();
                            Callback();
                        }
                    );

                }
            );

        }
    );

}

function SpawnBlockAnimation(source, callback) {
    let Size1 = Current.BlockSize;
    let Size2 = Current.BlockSize * 1.3;
    let Size3 = Size2 * 0.5;
    let SizeDelta = Size2 - Size1;
    let SizeAdjust = SizeDelta / 2;

    const To = GetXY(source);
    const From = {
        X: To.X,
        Y: To.Y,
        BX: (To.X - 1) * Current.BlockSize,
        BY: (To.Y - 1) * Current.BlockSize
    };

    let Size3Adjust = (Size1 - Size3) / 2;

    const ToX = (To.X - 1) * Current.BlockSize + Size3Adjust;
    const ToY = (To.Y - 1) * Current.BlockSize + Size3Adjust;

    source.style.left = ToX + 'px';
    source.style.top = ToY + 'px';

    source.Animate(
        { width: Size3 + 'px', height: Size3 + 'px', left: ToX + 'px', top: ToY + 'px', opacity: 0 },
        { width: Size2 + 'px', height: Size2 + 'px', left: (From.BX - SizeAdjust) + 'px', top: (From.BY - SizeAdjust) + 'px', opacity: 1 },
        {
            duration: 120,
            easing: 'ease-out',
            fill: 'forwards'
        },
        function() {

            source.Animate(
                { width: Size2 + 'px', height: Size2 + 'px', left: (From.BX - SizeAdjust) + 'px', top: (From.BY - SizeAdjust) + 'px' },
                { width: Size1 + 'px', height: Size1 + 'px', left: From.BX + 'px', top: From.BY + 'px' },
                {
                    duration: 40,
                    easing: 'ease-in',
                    fill: 'forwards'
                },
                callback
            );

        }
    );
}

function SinkStackAnimation(StackObj, Callback) {
    const Stack = StackObj.Stack;
    const Last = Stack[Stack.length - 1];

    async.eachSeries(Stack, function(Block, Next) {

        SinkBlockAnimation(Block, function() {
            if (Block.ID === Last.ID)
                Next();
        });

        if (Block.ID !== Last.ID) {
            setTimeout(function() {
                Next();
            }, 30);
        }

    }, function(err) {
        if (err)
            console.log(err);

        Callback();
    });
}

function SinkBlockAnimation(Block, Callback) {
    let P1 = Block.Y - 1;
    let P2 = P1 + Block.Distance;

    let Y1 = P1 * Current.BlockSize;
    let Y2 = P2 * Current.BlockSize;

    let EndY = P2 + 1;

    let Element = Block.Self;

    Element.dataset.y = EndY;
    Element.dataset.id = 'X' + Block.X + 'Y' + EndY;

    Element.Animate(
        { top: Y1 + 'px' },
        { top: Y2 + 'px' },
        {
            duration: 90 * Math.pow(Block.Distance, 0.8),
            easing: 'ease-in-out',
            fill: 'forwards'
        },
        Callback
    );
}

function RiseBlockAnimation(Block, Amount, Callback) {
    let P1 = Block.Y - 1;
    let P2 = P1 - Amount;

    let Y1 = P1 * Current.BlockSize;
    let Y2 = P2 * Current.BlockSize;

    let EndY = P2 + 1;

    let Element = Block.Self;

    Element.dataset.y = EndY;
    Element.dataset.id = 'X' + Block.X + 'Y' + EndY;


    let FROM = { top: Y1 + 'px' };
    let TO = { top: Y2 + 'px' };

    if (EndY < 1) {
        //FROM['backgroundColor'] = '#000';
        TO['backgroundColor'] = '#911';
    }

    Element.Animate(
        FROM,
        TO,
        {
            duration: Defaults.Scrolling.Speed * Amount,
            easing: Defaults.Scrolling.Easing,
            fill: 'forwards'
        },
        Callback
    );
}

function CalcScore(Bonus) {
    let P = [...Current.Selected];
    let Count = P.length;
    let First = (Count > 0 ? P[0] : null);

    if (First === null)
        return 0;

    let Num = First.Num;

    return CalculatePoints(Num, Count, Bonus);
}

function ScoreTable() {
    for (let i = 1; i < 10; i++) {
        let arr = [];
        for (let j = 2; j < 20; j++) {
            arr.push(CalculatePoints(i, j));
        }

        console.log(arr);
    }
}

function CalculatePoints(Num, Count, Bonus = 1) {
    let Blocks = Count * Math.pow((Num * 1.4) + 0.25, 2.4);
    let Multiplier = Math.pow(Count * 0.32, 1.25);
    let Level = 1 + (Current.Level * 0.75 / 100);

    let Total = Math.round((Blocks * Multiplier * Level) + (Num * 3.6));

    return Total * Bonus;
}

function FindGaps(Empties) {
    let Hanging = [];

    Current.Blocks.forEach((B) => {
        let F = GetFriends(B, false);

        if (Empties.filter(a => a.X === F.X && a.Y === F.Y).length < 1) {
            let U = CheckUnder(F);

            if (U !== null)
                Hanging.push(U);
        }
    });

    return Hanging;
}

function CheckUnder(F) {
    if (F.Y !== Defaults.Size && F.Under === null) {
        return {
            Element: F.Self,
            Distance: CheckDistanceUnder(F)
        }
    }

    return null;
}

function CheckDistanceUnder(F) {
    let Distance = 0;

    for (let i = F.Y + 1; i <= Defaults.Size; i++) {
        if (!CheckXY(F.X, i)) {

            Distance++;
        }
    }

    return Distance;
}

function FindStacked(arr) {
    let Stacks = [];

    arr.forEach(function(s) {
        let F = GetFriends(s.Element);

        Stacks.push(TraverseOvers(F, s.Distance, []));
    });

    return Stacks;
}

function TraverseOvers(F, Distance, Arr) {
    F['Distance'] = Distance;
    Arr.push(F);

    if (F.Over !== null) {
        let OF = GetFriends(F.Over);

        return TraverseOvers(OF, Distance, Arr);
    } else {
        return Arr;
    }
}

function CheckXY(x, y) {
    let obj = document.querySelector('.InnerSquare[data-x="' + x + '"][data-y="' + y + '"]');

    return obj !== null;
}

function GetXY(element) {
    if (element === null)
        return null;

    try {
        return {
            X: parseInt(element.dataset.x),
            Y: parseInt(element.dataset.y)
        }
    } catch (err) {
        return null;
    }
}

function GetAllEmptySquares() {
    let Arr = [];

    for (let y = 1; y <= Defaults.Size; y++) {
        for (let x = 1; x <= Defaults.Size; x++) {
            if (!CheckXY(x, y))
                Arr.push({
                    X: x - 1,
                    Y: y - 1,
                    ID: 'X' + x + 'Y' + y
                });
        }
    }

    return Arr;
}

