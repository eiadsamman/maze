"use strict";
export class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
export class Bounds {
	constructor() {
		/*false wall closed, true wall opened*/
		this.t = false;//top wall
		this.b = false;//bottom wall
		this.r = false;//right wall
		this.l = false;//left wall
		/*rollback on stack*/
		this.visited = false;
	}
};
export class Maze {
	constructor(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.dimension = new Point(0, 0);
		this.cellsize = 0;
		this.matrix = null;
		this.startpoint = null;
		this.endpoint = null;

		this.stack = [];
		this.frames = [0, 0];/* speed, counter */
		this.candidate = null;
		this.wallsize = 1;
		
		this.longest_path = {position:null, depth:0 }
	}
	drawCell(position, color = 100) {
		const cell = this.matrix[position.y][position.x];
		
		this.ctx.beginPath();
		this.ctx.rect(
			position.x * this.cellsize + this.wallsize,
			position.y * this.cellsize + (cell.t ? 0:this.wallsize),
			this.cellsize - this.wallsize * 2,
			this.cellsize - (cell.b ? 0:this.wallsize) - (cell.t ? 0:this.wallsize),
			);

		this.ctx.rect(
			position.x * this.cellsize + (cell.l ? 0:this.wallsize),
			position.y * this.cellsize + this.wallsize,
			this.cellsize - (cell.r ? 0:this.wallsize) - (cell.l ? 0:this.wallsize),
			this.cellsize - this.wallsize *2,
			);
		
		
		if(this.startpoint && this.startpoint.x == position.x && this.startpoint.y == position.y){
			/*Start point*/
			this.ctx.fillStyle = `hsl( 190, 100%, 30%)`;
		}else if(this.endpoint && this.endpoint.x == position.x && this.endpoint.y == position.y){
			/*End point*/
			this.ctx.fillStyle = `hsl( 0, 100%, 30%)`;
		}else if(cell.visited){
			/*Rollback on stack*/
			this.ctx.fillStyle = `hsl(190, 0%, 70%)`;
		}else{
			/*Crawling*/
			this.ctx.fillStyle = `hsl(100, 0%, 20%)`;
		}
		
		this.ctx.fill();
		
	}
	setSize(dimension) {
		this.dimension = dimension;
		this.canvas.width = dimension.x * this.cellsize;
		this.canvas.height = dimension.y * this.cellsize;
		this.matrix = new Array(this.dimension.y);
		for (let index = 0; index < this.dimension.y; index++) {
			this.matrix[index] = new Array(this.dimension.x);
			for(let col =0; col < this.dimension.x; col ++){
				this.matrix[index][col] = false;
			}
		}
		this.stack = [];
	}
	shuffle(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}
	surroundings(current){
		let output = 
			[new Point(current.x - 0, current.y + 1),
			new Point(current.x - 1, current.y - 0),
			new Point(current.x - 0, current.y - 1),
			new Point(current.x + 1, current.y - 0)];
		this.shuffle(output);
		return output;
	}
	build(dimension, cellsize, start, end = false) {
		this.cellsize = cellsize;
		this.setSize(dimension);
		this.startpoint = start;
		this.endpoint =  end ? new Point(end.x, end.y) : false;
		
		this.stack.push(this.startpoint);
		this.matrix[this.startpoint.y][this.startpoint.x] = new Bounds();
		this.matrix[this.startpoint.y][this.startpoint.x].visited = true;
		
		this.drawCell(this.startpoint, 80);
	}
	wallBuilder(prevcell, currentcell){
		if(prevcell.x > currentcell.x){ this.matrix[currentcell.y][currentcell.x].r = true;}
		if(prevcell.x < currentcell.x){ this.matrix[currentcell.y][currentcell.x].l = true;}
		if(prevcell.y > currentcell.y){ this.matrix[currentcell.y][currentcell.x].b = true;}
		if(prevcell.y < currentcell.y){ this.matrix[currentcell.y][currentcell.x].t = true;}
	}
	animate(speed) {
		this.frames[0]=speed;
		this.animator();
	}
	animator(){
		let ccc = requestAnimationFrame(() => this.animator());
		this.frames[1]++;
		if (this.frames[0] > this.frames[1]) {return; }
		this.frames[1] = 0;
		this.robot(ccc);
	}
	fast(){
		let x = 0;
		while(x<1000000){
			if(!this.robot()){
				break;
			}
			x++;
		}
	}
	robot(animation=null){
		let latest_stack = this.stack.length - 1;
		let current = this.stack[latest_stack];
		
		if(this.longest_path.depth < latest_stack){
			this.longest_path.depth = latest_stack;
			this.longest_path.position = current;
		}
		if(latest_stack > 0 && !this.candidate){
			this.matrix[current.y][current.x].visited = true;
			this.stack.splice(-1);
		}
		if(latest_stack == 0 && this.candidate==false){
			if(animation)
				cancelAnimationFrame(animation);
			this.endpoint = this.longest_path.position;
			this.plot();
			return false;
		}
		this.candidate=false;
		let nearby_points = this.surroundings(current);
		for(let near_index in nearby_points){
			const nearby_point = nearby_points[near_index];
			if(
				nearby_point.x >= 0 && nearby_point.y >= 0 && 
				nearby_point.x < this.dimension.x && nearby_point.y < this.dimension.y && 
				this.matrix[nearby_point.y][nearby_point.x] === false
				){
				this.candidate = nearby_point;
				//Open walls on current cells towards next cell
				this.wallBuilder(this.candidate,current);
				//Build walls on target cell
				this.matrix[this.candidate.y][this.candidate.x] = new Bounds();
				//Open walls on target cells from previous cell
				this.wallBuilder(current,this.candidate);
				//push target sell on stack
				this.stack.push(this.candidate);
				break;
			}
		}
		if(animation){
			this.plot();
		}
		return true;
	}
	plot() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (let row in this.matrix) {
			for (let col in this.matrix[row]) {
				if (this.matrix[row][col]) {
					this.drawCell(new Point(col, row), 100);
				}
			}
		}
	}
}