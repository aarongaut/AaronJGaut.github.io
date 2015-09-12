function getEntityFactory(attributes, constants) {
        function EntityCommon(x, y) {
                
                this.x = x;
                this.y = y;

                this.getBox = function() {
                        return {
                                "bl" : {
                                        "x" : this.x,
                                        "y" : this.y
                                },
                                "tr" : {
                                        "x" : this.x + this.width,
                                        "y" : this.y + this.height,
                                }
                        };
                };

                this.getSpriteCoord = function() {
                        var frameArray = this.spriteCoords[this.animationState];
                        var totalTime = 0;
                        for (var i = 0; i < frameArray.length; i++) {
                                totalTime += frameArray[i].time;
                        }

                        var modFrame = this.animationFrame % totalTime;

                        for (var i = 0; i < frameArray.length; i++) {
                                if (modFrame < frameArray[i].time) {
                                        return frameArray[i].coord;
                                } else {
                                        modFrame -= frameArray[i].time;
                                }
                        }

                };

                this.updateAnimationState = function(newState) {
                        if (this.animationState === newState) {
                                this.animationFrame++;
                        } else {
                                this.animationState = newState;
                                this.animationFrame = 0;
                        }
                };

                this.render = function(ctx, camera) {
                        var scale = constants.TILE_SIZE;
                        var spriteCoord = this.getSpriteCoord();
                        var postPoint = camera.transformPoint(this);
                        var drawX = Math.round(postPoint.x*scale);
                        var drawY = Math.round(ctx.canvas.height - (postPoint.y+this.height)*scale);
                        ctx.drawImage(this.sprites, spriteCoord.x*this.width*scale, spriteCoord.y*this.height*scale,
                                        this.width*scale, this.height*scale, drawX, drawY, 
                                        this.width*scale, this.height*scale);
                };
        }

        var entities = {};

        //entity classes start here
        entities.player = function(x, y, keyboard) {
                this.inherit = EntityCommon;
                this.inherit(x, y);
                this.keyboard = keyboard;
                this.onGround = true;
                this.vx = 0;
                this.vy = 0;
                this.MAX_JUMPS = 1;

                this.animationState = "standcenter";
                this.animationFrame = 0;
               
                this.midairJumps = this.MAX_JUMPS;

                this.getPhysicsSnapshot = function() {
                        return {
                                "onGround" : this.onGround,
                                "midairJump" : this.midairJumps,
                                "x" : this.x,
                                "y" : this.y,
                                "vx" : this.vx,
                                "vy" : this.vy
                        };
                };

                this.determineAnimationState = function() {
                        var keys = this.lastInput;

                        switch (this.facing) {
                                case undefined: 
                                        if (this.onGround) {
                                                this.updateAnimationState("standcenter");
                                        } else {
                                                this.facing = "right";
                                                this.updateAnimationState("jumpright");
                                        }
                                        break;
                                case "left":
                                        if (this.onGround) {
                                                if (keys.left && !keys.right) {
                                                        this.updateAnimationState("walkleft");
                                                        if (keys.action1) {
                                                                this.animationFrame++;
                                                        }
                                                } else {
                                                        this.updateAnimationState("standleft");
                                                }
                                        } else {
                                                this.updateAnimationState("jumpleft");
                                        }
                                        break;
                                case "right":
                                        if (this.onGround) {
                                                if (keys.right && !keys.left) {
                                                        this.updateAnimationState("walkright");
                                                        if (keys.action1) {
                                                                this.animationFrame++;
                                                        }
                                                } else {
                                                        this.updateAnimationState("standright");
                                                }
                                        } else {
                                                this.updateAnimationState("jumpright");
                                        }
                                        break;
                        }
                };

                this.lastInput = keyboard.getSnapshot();
                this.lastStep = this.getPhysicsSnapshot();
                
                this.step = function() {
                        this.lastStep = this.getPhysicsSnapshot();
                        var keyInput = keyboard.getSnapshot();

                        //gravity
                        this.vy -= 0.01; 

                        //friction
                        if (this.onGround) {
                                this.vx *= 0.4;
                        } else {
                                this.vx *= 0.95;
                                this.vy *= 0.98;
                        }

                        //clean up tiny vx
                        if (Math.abs(this.vx) < 0.0001) {
                                this.vx = 0;
                        }

                        //letting go of jump key
                        if (this.lastInput.jump && !keyInput.jump && this.vy > 0) {
                                this.vy = 0;
                        }
                        
                        //pressing jump key
                        if (!this.lastInput.jump && keyInput.jump) {
                                if (this.onGround) {
                                        this.vy += 0.35; 
                                }
                                else if (this.midairJumps > 0) {
                                        this.vy += 0.3;
                                        this.midairJumps--;
                                }
                        }

                        //pressing left key
                        if (keyInput.left && !keyInput.right) {
                                if (this.onGround) {
                                        if (keyInput.action1) {
                                                this.vx -= 0.1;
                                        } else {
                                                this.vx -= 0.055;
                                        }
                                } else {
                                        this.vx -= 0.008;
                                }
                        
                                this.facing = "left";
                        }

                        //pressing right key
                        if (keyInput.right && !keyInput.left) {
                                if (this.onGround) {
                                        if (keyInput.action1) {
                                                this.vx += 0.1;
                                        } else {
                                                this.vx += 0.055;
                                        }
                                } else {
                                        this.vx += 0.008;
                                }
                                
                                this.facing = "right";
                        }

                        //update position
                        this.x += this.vx;
                        this.y += this.vy;


                        //store input
                        this.lastInput = keyInput;
                
                        this.determineAnimationState();
                        
                        this.onGround = false;
                }

                this.collide = function(collision) {
                        if (collision.obstruct) {
                                switch (collision.side) {
                                        case "top" :
                                                if (this.vy > 0) {
                                                        this.vy *= -0.4;
                                                }
                                                this.y = collision.y-this.height;
                                                break;
                                        case "bottom" :
                                                this.vy = 0;
                                                this.y = collision.y;
                                                this.onGround = true;
                                                this.midairJumps = this.MAX_JUMPS;
                                                break;
                                        case "left" :
                                                this.vx = 0;
                                                this.x = collision.x;
                                                break;
                                        case "right" :
                                                this.vx = 0;
                                                this.x = collision.x-this.width;
                                                break;
                                }
                        }
                }
        };

        entities.mob = function(x, y) {
                this.inherit = EntityCommon;
                this.inherit(x, y);
                
                this.animationState = "standcenter";
                this.animationFrame = 0;

                this.step = function() { return; };
        }
        //entity classes end here

        for (e in entities) {
                for (attr in attributes[e]) {
                        entities[e].prototype[attr] = attributes[e][attr];
                }
        }

        return entities;
}