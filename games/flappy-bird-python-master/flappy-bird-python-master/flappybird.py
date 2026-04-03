import pygame
from sys import exit
import random

#game variables
GAME_WIDTH = 360
GAME_HEIGHT = 640

#bird class
bird_x = GAME_WIDTH/8
bird_y = GAME_HEIGHT/2
bird_width = 34 #17/12
bird_height = 24

class Bird(pygame.Rect):
    def __init__(self, img):
        pygame.Rect.__init__(self, bird_x, bird_y, bird_width, bird_height)
        self.img = img

#pipe class
pipe_x = GAME_WIDTH
pipe_y = 0
pipe_width = 64 #1/8
pipe_height = 512

class Pipe(pygame.Rect):
    def __init__(self, img):
        pygame.Rect.__init__(self, pipe_x, pipe_y, pipe_width, pipe_height)
        self.img = img
        self.passed = False

#game images
background_image = pygame.image.load("flappybirdbg.png")
bird_image = pygame.image.load("flappybird.png")
bird_image = pygame.transform.scale(bird_image, (bird_width, bird_height))
top_pipe_image = pygame.image.load("toppipe.png")
top_pipe_image = pygame.transform.scale(top_pipe_image, (pipe_width, pipe_height))
bottom_pipe_image = pygame.image.load("bottompipe.png")
bottom_pipe_image = pygame.transform.scale(bottom_pipe_image, (pipe_width, pipe_height))

start_image = pygame.image.load("start.png")
start_image = pygame.transform.scale(start_image, (GAME_WIDTH, GAME_HEIGHT))

#game logic
bird = Bird(bird_image)
pipes = []
velocity_x = -2 #move pipes to the left speed (simulates bird moving right)
velocity_y = 0 #move bird up/down speed
gravity = 0.4
score = 0
game_over = False  # kept for legacy but using game_state
game_state = 'start'
start_time = 0
quit_rect = pygame.Rect(340, 5, 15, 15)

def draw():
    if game_state == 'start':
        window.blit(start_image, (0, 0))
    else:
        window.blit(background_image, (0, 0))
        window.blit(bird.img, bird)

        for pipe in pipes:
            window.blit(pipe.img, pipe)
    
    text_str = str(int(score))
    if game_state == 'game_over':
        text_str = "Game Over: " + text_str + "\nUse Spacebar"
    elif game_state == 'start':
        text_str = "Get Ready!\nUse Spacebar"

    text_font = pygame.font.SysFont("Comic Sans MS", 35)
    lines = text_str.split('\n')
    if game_state == 'playing':
        text_font = pygame.font.SysFont("Comic Sans MS", 45)
        text_render = text_font.render(str(int(score)), True, "white")
        window.blit(text_render, (5, 0))
        return  # Early return for gameplay score
    
    text_font = pygame.font.SysFont("Comic Sans MS", 35)
    y_pos = 20 if game_state == 'start' else GAME_HEIGHT // 2 - 40
    for line in lines:
        text_render = text_font.render(line, True, "white")
        window.blit(text_render, ((GAME_WIDTH - text_render.get_width()) // 2, y_pos))
        y_pos += 40
    
    # Quit button always visible
    pygame.draw.rect(window, (200, 0, 0), quit_rect)
    pygame.draw.rect(window, (255, 255, 255), quit_rect, 2)
    font_small = pygame.font.SysFont("Comic Sans MS", 18)
    x_text = font_small.render("X", True, (255, 255, 255))
    x_offset = (quit_rect.width - x_text.get_width()) // 2
    y_offset = (quit_rect.height - x_text.get_height()) // 2
    window.blit(x_text, (quit_rect.x + x_offset, quit_rect.y + y_offset))

def move():
    global velocity_y, score, game_state
    velocity_y += gravity
    bird.y += velocity_y
    bird.y = max(bird.y, 0) #limit bird to top of canvas

    if bird.y > GAME_HEIGHT:
        game_state = 'game_over'
        return

    for pipe in pipes:
        pipe.x += velocity_x

        if not pipe.passed and bird.x > pipe.x + pipe.width:
            score += 0.5 #0.5 because there are 2 pipes! 0.5*2 = 1, 1 per set of pipes
            pipe.passed = True
        
        if bird.colliderect(pipe):
            game_state = 'game_over'
            return
    #clean up pipes that moved off left side of screen
    while len(pipes) > 0 and pipes[0].x < -pipe_width:
        pipes.pop(0) #removes first element from the list

def create_pipes():
    random_pipe_y = pipe_y - pipe_height/4 - random.random()*(pipe_height/2) #0-h/2
    opening_space = GAME_HEIGHT/4

    top_pipe = Pipe(top_pipe_image)
    top_pipe.y = random_pipe_y
    pipes.append(top_pipe)

    bottom_pipe = Pipe(bottom_pipe_image)
    bottom_pipe.y = top_pipe.y + top_pipe.height + opening_space
    pipes.append(bottom_pipe)

    print(len(pipes))

pygame.init() #always needed to initialize pygame
pygame.mixer.init()
pygame.mixer.music.load("viacheslavstarostin-gaming-game-video-game-music-474517.mp3")
pygame.mixer.music.play(-1)
window = pygame.display.set_mode((GAME_WIDTH, GAME_HEIGHT))
pygame.display.set_caption("Flappy Bird")
clock = pygame.time.Clock()
start_time = pygame.time.get_ticks()

create_pipes_timer = pygame.USEREVENT + 0
pygame.time.set_timer(create_pipes_timer, 1500) #marks every 1.5 seconds

while True: #game loop
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            exit()
        
        if event.type == pygame.MOUSEBUTTONDOWN:
            if quit_rect.collidepoint(event.pos):
                pygame.quit()
                exit()
        
        if event.type == create_pipes_timer and game_state == 'playing':
            create_pipes()
        
        if event.type == pygame.KEYDOWN:
            if event.key in (pygame.K_SPACE, pygame.K_x, pygame.K_UP):
                if game_state == 'playing':
                    velocity_y = -6
                elif game_state == 'game_over':
                    #reset game
                    bird.y = bird_y
                    pipes.clear()
                    score = 0
                    velocity_y = 0
                    game_state = 'playing'
    
    if game_state == 'start':
        if pygame.time.get_ticks() - start_time > 5000:
            game_state = 'playing'
    elif game_state == 'playing':
        move()
    
    draw()
    pygame.display.update()
    clock.tick(60) #60 fps

