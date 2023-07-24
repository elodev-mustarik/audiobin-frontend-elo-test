import { TestBed } from '@angular/core/testing';

import { Mp3ParserService } from './mp3Parser.service';

describe('Mp3ParserService', () => {
  let service: Mp3ParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mp3ParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
