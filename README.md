# maze
2022-12-01

A maze builder using the Graph theory based methods / Randomized depth-first search
https://en.wikipedia.org/wiki/Maze_generation_algorithm

The build can be done all at once or animated

Code sample
    import {Maze,Point} from "./script.js"
		const maze = new Maze(document.getElementById("canvas1"));
    //Set maze size to 30 x 30 cells
		let size = new Point(30, 30);
    //Point:Maze size, int:cell size, Point:starting point
		maze.build(size, 20 , new Point(Math.floor(Math.random() * size.x), Math.floor(Math.random() * size.y)));
    //Set wall thickness between cells
		maze.wallsize = 4;
    //Start animation (int: with 0 being no delay)
		maze.animate(0);
    //Alternative to animations, build all at once
		maze.fast();
