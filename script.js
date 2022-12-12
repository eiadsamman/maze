"use strict";
let debugFPS = document.getElementById("fps");
/**
 * Generate a random maze with a given x-y dimensions.
 * Output can be animated to show the generating path.
 * Algorithm used for this class `Randomized depth-first search`
 * Algorithm speed O(2n) with n is total number of cells in the maze x * y
 * 
 * @author eiadsamman
 * @version 1.0.0
 * @date 2022-12-09
 */


export class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

/**
 * Boundaries object
 * defines cell four sides wall status
 * defines cell visiting status
 */
export class Bounds {
	constructor() {
		/*false: wall is closed, true: wall is opened*/
		this.t = false;/* top wall */
		this.b = false;/* bottom wall */
		this.r = false;/* right wall */
		this.l = false;/* left wall */
		/* rollback on stack trigger */
		this.visited = false;
	}
};



export class Maze {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.dimension = new Point(0, 0);

		this.matrix = null;
		this.startpoint = null;
		this.endpoint = null;

		this.stack = [];
		/* Control animation progress [threshold, frames counter] */
		this.frames = [0, 0];
		this.candidate = null;
		this._wallsize = 4;
		this._cellsize = 20;

		this.longest_path = { position: null, depth: 0 }
		this.animatorReference = null;
		this.performance = null;
	}


	set wallsize(size) {
		this._wallsize = Math.max(1, Math.min(parseInt(size) , this._cellsize / 2 - 1));
	}
	set cellsize(size) {
		this._cellsize = Math.max(parseInt(size), this._wallsize * 2 + 1);
		this.canvas.width = this.dimension.x * this._cellsize;
		this.canvas.height = this.dimension.y * this._cellsize;
	}


	/** drawCell
	* draw cell using cell boundaries
	* @param {Number} position cell position on canvas
	* @return {void}
	*/
	drawCell(position) {
		const cell = this.matrix[position.y][position.x];
		/* 
		 * draw individual cell in two steps, to handle wall thickness
		 */
		this.ctx.beginPath();

		/* 
		 * Horizontal rectangle
		 */
		this.ctx.rect(
			position.x * this._cellsize + this._wallsize,
			position.y * this._cellsize + (cell.t ? 0 : this._wallsize),
			this._cellsize - this._wallsize * 2,
			this._cellsize - (cell.b ? 0 : this._wallsize) - (cell.t ? 0 : this._wallsize),
		);
		/* 
		* Vertical rectangle
		*/
		this.ctx.rect(
			position.x * this._cellsize + (cell.l ? 0 : this._wallsize),
			position.y * this._cellsize + this._wallsize,
			this._cellsize - (cell.r ? 0 : this._wallsize) - (cell.l ? 0 : this._wallsize),
			this._cellsize - this._wallsize * 2,
		);

		/* Filling style */
		if (this.startpoint && this.startpoint.x == position.x && this.startpoint.y == position.y) {
			/*Start point*/
			this.ctx.fillStyle = `hsl( 190, 100%, 30%)`;
		} else if (this.endpoint && this.endpoint.x == position.x && this.endpoint.y == position.y) {
			/*End point*/
			this.ctx.fillStyle = `hsl( 0, 100%, 30%)`;
		} else if (cell.visited) {
			/*Rollback on stack*/
			this.ctx.fillStyle = `hsl(0, 0%, 100%)`;
		} else {
			/*Crawling*/
			this.ctx.fillStyle = `hsl(100, 0%, 20%)`;
		}

		this.ctx.fill();
	}

	/** setSize
	* change maze dimensions
	* @param {Point} dimension maze dimension x&y
	* @return {void}
	*/
	setSize(dimension) {
		this.dimension = dimension;
		this.canvas.width = dimension.x * this._cellsize;
		this.canvas.height = dimension.y * this._cellsize;
		/* 2d array */
		this.matrix = new Array(this.dimension.y);
		for (let index = 0; index < this.dimension.y; index++) {
			this.matrix[index] = new Array(this.dimension.x);
			for (let col = 0; col < this.dimension.x; col++) {
				this.matrix[index][col] = false;
			}
		}
		this.stack = [];
	}

	/** shuffle
	* shuffle input array to randomize maze generating
	* @param {Array} array input array to shuffle
	* @return {void}
	*/
	shuffle(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	/** #surroundings
	* return all four sides position for a given cell
	* @param {Point} current current cell Point x&y
	* @return {Array}
	*/
	#surroundings(current) {
		let output =
			[new Point(current.x - 0, current.y + 1),
			new Point(current.x - 1, current.y - 0),
			new Point(current.x - 0, current.y - 1),
			new Point(current.x + 1, current.y - 0)];
		/* Shuffle the cells for a random generating */
		this.shuffle(output);
		return output;
	}

	/** build
	* building function to start maze generation
	* @param {Point} dimension maze dimensions Point x&y
	* @param {Number} _cellsize cell rectangle dimension
	* @param {Point} start set starting coordinates Point x&y
	* @param {Point} end set ending coordinates Point x&y, omit to chose the longest path found instead
	* @return {Array}
	*/
	build(dimension, start, end = false) {

		if (this.animator) {
			window.cancelAnimationFrame(this.animatorReference);
		}
		this.setSize(dimension);
		this.startpoint = start;
		this.endpoint = end ? new Point(end.x, end.y) : false;
		this.longest_path = { position: null, depth: 0 }
		this.candidate = null;

		/* Add starting point to the stack */
		this.stack.push(this.startpoint);
		this.matrix[this.startpoint.y][this.startpoint.x] = new Bounds();
		this.matrix[this.startpoint.y][this.startpoint.x].visited = true;
		/* Draw starting cell */
		this.drawCell(this.startpoint);
	}

	/** #wallBuilder
	* open walls between two concatenative cells based on generating direction
	* @param {Point} prevcell prvious cell
	* @param {Point} currentcell current cell
	* @return {void}
	*/
	#wallBuilder(prevcell, currentcell) {
		if (prevcell.x > currentcell.x) { this.matrix[currentcell.y][currentcell.x].r = true; }
		if (prevcell.x < currentcell.x) { this.matrix[currentcell.y][currentcell.x].l = true; }
		if (prevcell.y > currentcell.y) { this.matrix[currentcell.y][currentcell.x].b = true; }
		if (prevcell.y < currentcell.y) { this.matrix[currentcell.y][currentcell.x].t = true; }
	}

	/** animate
	* send animating instructions to animator function
	* @param {Number} speed animating speed with 0 no delay between frames
	* @return {void}
	*/
	animate(speed) {
		this.frames[0] = speed;
		this.animator();
	}

	/** animator
	* animator function handling requestAnimationFrame
	* @param {Number} speed animating speed with 0 no delay between frames
	* @return {void}
	*/
	animator() {
		this.animatorReference = window.requestAnimationFrame(() => this.animator());

		let fps = 1 / ((performance.now() - this.performance) / 1000);
		debugFPS.innerHTML = parseInt(fps) + "fps";
		this.performance = performance.now();

		/* Skip frames to slow down animations */
		this.frames[1]++;
		if (this.frames[0] > this.frames[1]) { return; }
		this.frames[1] = 0;
		this.generator(this.animatorReference);
	}

	/** animator
	* generate the maze without animations, loop through each cell and build the stack 
	* terminate when the stack is empty which indicates that all cells have been built
	* @return {void}
	*/
	fast() {
		while (this.generator(null));
		debugFPS.innerHTML = "0fps";
	}

	/** generator
	* generator function that walk through every cell, check condition change direction
	* chose the candidate cell, build the stack and destroy its elements
	* terminate when the stack is empty which indicates that all cells have been built
	* @param {bool} animation
	* @return {bool}
	*/
	generator(animate = null) {
		let latest_stack = this.stack.length - 1;
		/* latest element on the stack */
		let current = this.stack[latest_stack];

		/* registering the longest path if end point isn't specified */
		if (!this.endpoint && this.longest_path.depth < latest_stack) {
			this.longest_path.depth = latest_stack;
			this.longest_path.position = current;
		}
		/* if latest item on stack has no nearby candidates remove it from the stack
		 * and mark it as visited */
		if (latest_stack > 0 && !this.candidate) {
			this.matrix[current.y][current.x].visited = true;
			this.stack.splice(-1);
		}
		/* if stack is empty and no more candidates are available, cancel
		 * the animation frame request, plot the maze and return false
		 */
		if (latest_stack == 0 && this.candidate == false) {
			if (animate)
				window.cancelAnimationFrame(animate);
			/* If end point isn't send, chose the longest path end */
			if (!this.endpoint) {
				this.endpoint = this.longest_path.position;
			}
			this.plot();
			return false;
		}

		/* Search for a candidate cell */
		this.candidate = false;
		/* Get the 4 nearby cells */
		let nearby_points = this.#surroundings(current);
		/* Loop through the candidates */
		for (let near_index in nearby_points) {
			const nearby_point = nearby_points[near_index];
			/* if the candidate isn't out of borders and isn't visited yet */
			if (
				nearby_point.x >= 0 && nearby_point.y >= 0 &&
				nearby_point.x < this.dimension.x && nearby_point.y < this.dimension.y &&
				this.matrix[nearby_point.y][nearby_point.x] === false
			) {
				this.candidate = nearby_point;

				/* Build walls on target cell */
				this.matrix[this.candidate.y][this.candidate.x] = new Bounds();

				/* Open walls on current cells towards next cell */
				this.#wallBuilder(this.candidate, current);

				/* Open walls on target cells from previous cell */
				this.#wallBuilder(current, this.candidate);

				/* push target sell on stack */
				this.stack.push(this.candidate);

				break;
			}
		}
		if (animate) {
			this.plot();
		}
		return true;
	}

	/** plot
	* plotting function, called each frame
	* @return {void}
	*/
	plot() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (let row in this.matrix) {
			for (let col in this.matrix[row]) {
				if (this.matrix[row][col]) {
					this.drawCell(new Point(col, row));
				}
			}
		}
	}
}